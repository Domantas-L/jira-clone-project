const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const { eq } = require('drizzle-orm');
const express = require('express');
const router = express.Router();
const db = require('../db');
const { Users, refresh_token } = require('../schema');

const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET;
const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET;
const bcrypt_cost = 12;

function validateCredentials(email, password) {
    if (!email || !password)
        return "Email and password are required";
    if (typeof email !== "string" || typeof password !== "string")
        return "Invalid input types";
    if (password.length < 8)
        return "Password must be at least 8 characters long";
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email))
        return "Invalid email format";
    return null;
}

function generateAccessToken(user) {
    return jwt.sign({ sub: user.id, role: user.role }, ACCESS_TOKEN_SECRET, { expiresIn: "15m" });
}

function generateRefreshToken(user) {
    return jwt.sign({ sub: user.id, jti: crypto.randomUUID() }, REFRESH_TOKEN_SECRET, { expiresIn: "1d" });
}

function hashToken(token) {
    return crypto.createHash('sha256').update(token).digest('hex');
}

router.post("/auth/register", async (req, res) => {
    try {
        const { email, password } = req.body;
        const validationError = validateCredentials(email, password);
        if (validationError) return res.status(400).json({ error: validationError });

        const normalizedEmail = email.trim().toLowerCase();
        const passwordHash = await bcrypt.hash(password, bcrypt_cost);

        let newUser;
        try {
            [newUser] = await db.insert(Users)
                .values({ email: normalizedEmail, passwordHash })
                .returning();
        } catch (err) {
            if (err.message.includes("UNIQUE constraint failed")) {
                return res.status(409).json({ error: "Email is in use" });
            }
            throw err;
        }

        const accessToken = generateAccessToken(newUser);
        const refreshToken = generateRefreshToken(newUser);

        await db.insert(refresh_token).values({
            user_id: newUser.id,
            token_hash: hashToken(refreshToken),
            expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000),
            is_revoked: false,
        });

        return res.status(201).json({ accessToken, refreshToken });
    } catch (err) {
        console.error("Register error:", err);
        return res.status(500).json({ error: "Internal server error" });
    }
});

router.post("/auth/login", async (req, res) => {
    try {
        const { email, password } = req.body;
        const validationError = validateCredentials(email, password);
        if (validationError) return res.status(400).json({ error: validationError });

        const normalizedEmail = email.trim().toLowerCase();
        const user = await db.query.Users.findFirst({ where: eq(Users.email, normalizedEmail) });
        if (!user) return res.status(401).json({ error: "Invalid email or password" });

        const passwordMatch = await bcrypt.compare(password, user.passwordHash);
        if (!passwordMatch) return res.status(401).json({ error: "Invalid email or password" });

        const accessToken = generateAccessToken(user);
        const refreshToken = generateRefreshToken(user);

        await db.insert(refresh_token).values({
            user_id: user.id,
            token_hash: hashToken(refreshToken),
            expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000),
            is_revoked: false,
        });

        return res.status(200).json({ accessToken, refreshToken });
    } catch (err) {
        console.error("Login error:", err);
        return res.status(500).json({ error: "Internal server error" });
    }
});

router.post("/auth/refresh", async (req, res, next) => {
    try {
        const { refreshToken } = req.body;
        if (!refreshToken) return res.status(400).json({ error: "refresh token required" });

        let payload;
        try {
            payload = jwt.verify(refreshToken, REFRESH_TOKEN_SECRET);
        } catch {
            return res.status(401).json({ error: "Invalid or expired refresh token" });
        }

        const tokenHash = hashToken(refreshToken);
        const storedToken = await db.query.refresh_token.findFirst({
            where: eq(refresh_token.token_hash, tokenHash)
        });

        if (!storedToken || storedToken.is_revoked || storedToken.expires_at < new Date()) {
            return res.status(401).json({ error: "refresh token revoked or expired" });
        }

        const user = await db.query.Users.findFirst({ where: eq(Users.id, payload.sub) });
        if (!user) return res.status(401).json({ error: "User not found" });

        await db.update(refresh_token)
            .set({ is_revoked: true, revoked_at: new Date() })
            .where(eq(refresh_token.id, storedToken.id));

        const newAccessToken = generateAccessToken(user);
        const newRefreshToken = generateRefreshToken(user);

        await db.insert(refresh_token).values({
            user_id: user.id,
            token_hash: hashToken(newRefreshToken),
            expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000),
            is_revoked: false,
        });

        return res.json({ accessToken: newAccessToken, refreshToken: newRefreshToken });
    } catch (err) {
        next(err);
    }
});

function requireAuth(req, res, next) {
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

    if (!token) return res.status(401).json({ error: "No token provided" });
    try {
        req.auth = jwt.verify(token, ACCESS_TOKEN_SECRET);
        next();
    } catch {
        return res.status(401).json({ error: "Invalid or expired access token" });
    }
}

router.get("/me", requireAuth, async (req, res) => {
    const user = await db.query.Users.findFirst({ where: eq(Users.id, req.auth.sub) });
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json({ id: user.id, email: user.email, role: user.role });
});

export default router;