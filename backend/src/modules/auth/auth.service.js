import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { prisma } from '../../config/prisma.js';


export async function login(email, password) {
  const user = await prisma.user.findUnique({ where: { email } });

  const valid = user ? await bcrypt.compare(password, user.passwordHash) : false;

  if (!user || !valid || !user.active) return null;

  const token = jwt.sign(
    { sub: String(user.id), role: user.role }, 
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN ?? '8h' },
  );

  return { token, user: { id: user.id, name: user.name, email: user.email, role: user.role } };
}
