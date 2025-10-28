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

export const validateCheckCreation = (req: Request, res: Response, next: NextFunction) => {
  const schema = Joi.object({
    url: Joi.string()
      .uri({ scheme: ['http', 'https'] })
      .required()
      .messages({
        'string.uri': 'URL debe ser una URL válida con http:// o https://',
        'any.required': 'URL es requerida'
      }),
    name: Joi.string()
      .max(100)
      .optional()
      .messages({
        'string.max': 'Nombre no puede exceder 100 caracteres'
      }),
    interval: Joi.string()
      .valid('5min', '1hour', '1day')
      .required()
      .messages({
        'any.only': 'Interval debe ser uno de: 5min, 1hour, 1day',
        'any.required': 'Interval es requerido'
      }),
    regions: Joi.array()
      .items(Joi.string().valid('sao-paulo', 'new-york', 'frankfurt'))
      .min(1)
      .max(3)
      .required()
      .messages({
        'array.min': 'Debe seleccionar al menos una región',
        'array.max': 'Máximo 3 regiones permitidas',
        'any.only': 'Regiones válidas: sao-paulo, new-york, frankfurt',
        'any.required': 'Regiones son requeridas'
      }),
    timeout: Joi.number()
      .integer()
      .min(5)
      .max(120)
      .default(30)
      .messages({
        'number.min': 'Timeout mínimo es 5 segundos',
        'number.max': 'Timeout máximo es 120 segundos'
      }),
    expectedStatusCode: Joi.number()
      .integer()
      .min(100)
      .max(599)
      .default(200)
      .messages({
        'number.min': 'Código de estado debe ser entre 100-599',
        'number.max': 'Código de estado debe ser entre 100-599'
      })
  });

  const { error, value } = schema.validate(req.body);
  
  if (error) {
    return res.status(400).json({
      status: 'error',
      message: 'Datos de validación incorrectos',
      errors: error.details.map(detail => detail.message)
    });
  }

  req.body = value;
  return next();
};