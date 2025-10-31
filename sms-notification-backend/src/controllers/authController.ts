import { Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { Doctor } from '../models/doctor';
import { Patient } from '../models/patient';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

class AuthController {
    async login(req: Request, res: Response) {
        const userType = req.body.userType; // 'doctor' or 'patient'
        const email = req.body.email;
        const password = req.body.password;

        const user = userType === 'doctor' ? await Doctor.findOne({ email }) : await Patient.findOne({ email });

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        const token = jwt.sign({ id: user._id, userType }, 'your_jwt_secret', { expiresIn: '1h' });
        res.json({ token });
    }

    async register(req: Request, res: Response) {
        const userType = req.body.userType; // 'doctor' or 'patient'
        const email = req.body.email;
        const password = req.body.password;

        const existingUser = userType === 'doctor' ? await Doctor.findOne({ email }) : await Patient.findOne({ email });

        if (existingUser) {
            return res.status(400).json({ message: 'User already exists' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = userType === 'doctor' ? new Doctor({ email, password: hashedPassword }) : new Patient({ email, password: hashedPassword });

        await newUser.save();
        res.status(201).json({ message: 'User registered successfully' });
    }

    validateLogin() {
        return [
            body('userType').isIn(['doctor', 'patient']).withMessage('User type must be either doctor or patient'),
            body('email').isEmail().withMessage('Email is not valid'),
            body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters long'),
        ];
    }

    validateRegistration() {
        return [
            body('userType').isIn(['doctor', 'patient']).withMessage('User type must be either doctor or patient'),
            body('email').isEmail().withMessage('Email is not valid'),
            body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters long'),
        ];
    }
}

export default new AuthController();