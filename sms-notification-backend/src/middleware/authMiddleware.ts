import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const secretKey = 'your_secret_key'; // Replace with your actual secret key

export const authenticateToken = (req: Request, res: Response, next: NextFunction) => {
    const token = req.headers['authorization']?.split(' ')[1];
    if (!token) return res.sendStatus(401);

    jwt.verify(token, secretKey, (err: any, user: any) => {
        if (err) return res.sendStatus(403);
        req.user = user;
        next();
    });
};

export const authorizeDoctor = (req: Request, res: Response, next: NextFunction) => {
    if (req.user.role !== 'doctor') {
        return res.sendStatus(403);
    }
    next();
};

export const authorizePatient = (req: Request, res: Response, next: NextFunction) => {
    if (req.user.role !== 'patient') {
        return res.sendStatus(403);
    }
    next();
};