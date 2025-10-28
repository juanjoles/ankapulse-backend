export const validateUrlAccessibility = async (url: string): Promise<{ isAccessible: boolean; error?: string }> => {
  try {
    // Verificar formato HTTP/HTTPS
    const urlPattern = /^https?:\/\/.+/;
    if (!urlPattern.test(url)) {
      return { isAccessible: false, error: 'URL debe comenzar con http:// o https://' };
    }

    // Hacer HEAD request para verificar accesibilidad
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 segundos

    const response = await fetch(url, {
      method: 'HEAD',
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    // Aceptar códigos de estado < 500
    if (response.status >= 500) {
      return { isAccessible: false, error: 'Error del servidor (5xx)' };
    }

    return { isAccessible: true };
  } catch (error: any) {
    let errorMessage = 'URL no es accesible';
    
    if (error.name === 'AbortError') {
      errorMessage = 'Timeout al acceder a la URL';
    } else if (error.code === 'ENOTFOUND') {
      errorMessage = 'Dominio no encontrado';
    } else if (error.code === 'ECONNREFUSED') {
      errorMessage = 'Conexión rechazada';
    }

    return { isAccessible: false, error: errorMessage };
  }
};