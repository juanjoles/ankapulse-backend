declare global {
  namespace Express {
    export interface Request {
      user?: {
        sub: string;          // ID de Auth0
        userId?: string;      // ID de tu BD (si lo mapeas)
        email?: string;
        name?: string;
        picture?: string;
        provider?: string;
        [key: string]: any;
      };
    }
  }
}

export {};