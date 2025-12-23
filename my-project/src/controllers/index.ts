import { Request, Response } from 'express';

// Example controller class
class UserController {
    // Method to handle user creation
    public createUser(req: Request, res: Response): void {
        // Logic for creating a user
        res.status(201).send({ message: 'User created successfully' });
    }

    // Method to handle fetching a user
    public getUser(req: Request, res: Response): void {
        const userId = req.params.id;
        // Logic for fetching a user by ID
        res.status(200).send({ message: `User with ID ${userId}` });
    }

    // Method to handle updating a user
    public updateUser(req: Request, res: Response): void {
        const userId = req.params.id;
        // Logic for updating a user by ID
        res.status(200).send({ message: `User with ID ${userId} updated successfully` });
    }

    // Method to handle deleting a user
    public deleteUser(req: Request, res: Response): void {
        const userId = req.params.id;
        // Logic for deleting a user by ID
        res.status(204).send();
    }
}

// Exporting an instance of UserController
export const userController = new UserController();