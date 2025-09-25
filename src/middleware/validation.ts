import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';

const registerSchema = Joi.object({
  nombre: Joi.string()
    .min(2)
    .max(50)
    .required()
    .messages({
      'string.empty': 'El nombre es requerido',
      'string.min': 'El nombre debe tener al menos 2 caracteres',
      'string.max': 'El nombre no puede exceder 50 caracteres'
    }),
  
  email: Joi.string()
    .email()
    .required()
    .messages({
      'string.empty': 'El email es requerido',
      'string.email': 'El email debe tener un formato válido'
    }),
  
  password: Joi.string()
    .min(8)
    .pattern(new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)'))
    .required()
    .messages({
      'string.empty': 'La contraseña es requerida',
      'string.min': 'La contraseña debe tener al menos 8 caracteres',
      'string.pattern.base': 'La contraseña debe contener al menos una mayúscula, una minúscula y un número'
    })
});

export const validateUserRegistration = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const { error } = registerSchema.validate(req.body, { abortEarly: false });
  
  if (error) {
    const errorMessages = error.details.map(detail => detail.message);
    res.status(400).json({
      status: 'error',
      message: 'Errores de validación',
      errors: errorMessages
    });
    return;
  }
  
  next();
};