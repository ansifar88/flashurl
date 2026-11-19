import { User } from "../models/user.model";

interface CreateUserData {
  name: string;
  email: string;
  passwordHash: string;
}

export async function createUser(data: CreateUserData): Promise<User> {
  return User.create({
    ...data,
    role: "user",
  });
}

export async function findUserById(id: string): Promise<User | null> {
  return User.findByPk(id);
}

export async function findUserByEmail(email: string): Promise<User | null> {
  return User.findOne({
    where: { email },
  });
}
