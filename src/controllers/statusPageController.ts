import { Request, Response } from 'express';
import { StatusPageService } from '../services/statusPage.service';

const statusPageService = new StatusPageService();

// ====================================================
// CREAR O ACTUALIZAR STATUS PAGE (PRIVADO)
// ====================================================
export async function createOrUpdateStatusPage(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user?.sub || req.user?.userId;

    if (!userId) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }

    const { slug, enabled, title, description, monitorIds } = req.body;

    // Validaciones básicas
    if (!slug) {
      res.status(400).json({ error: 'Slug is required' });
      return;
    }

    if (!Array.isArray(monitorIds)) {
      res.status(400).json({ error: 'monitorIds must be an array' });
      return;
    }

    // Crear o actualizar
    const statusPage = await statusPageService.createOrUpdateStatusPage(userId, {
      slug,
      enabled: enabled ?? false,
      title: title || null,
      description: description || null,
      monitorIds
    });

    // URL pública del status page
    const frontendUrl = process.env.FRONTEND_URL || 'https://ankapulse.app';
    const publicUrl = `${frontendUrl}/status/${statusPage.slug}`;

    res.json({
      success: true,
      data: statusPage,
      publicUrl
    });

  } catch (error: any) {
    console.error('Error creating/updating status page:', error);
    
    // Errores específicos del service
    if (error.message.includes('slug') || 
        error.message.includes('Slug') ||
        error.message.includes('monitores')) {
      res.status(400).json({ error: error.message });
      return;
    }

    res.status(500).json({ error: 'Failed to create/update status page' });
  }
}

// ====================================================
// OBTENER CONFIG DE STATUS PAGE (PRIVADO)
// ====================================================
export async function getStatusPageConfig(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user?.sub || req.user?.userId;

    if (!userId) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }

    const statusPage = await statusPageService.getStatusPageConfig(userId);

    if (!statusPage) {
      res.status(404).json({ 
        success: false,
        error: 'Status page not found',
        data: null 
      });
      return;
    }

    // Formatear la respuesta
    const response = {
      success: true,
      data: {
        id: statusPage.id,
        slug: statusPage.slug,
        enabled: statusPage.enabled,
        title: statusPage.title,
        description: statusPage.description,
        monitors: statusPage.monitors.map(m => ({
          checkId: m.checkId,
          displayOrder: m.displayOrder,
          check: {
            id: m.check.id,
            name: m.check.name,
            url: m.check.url,
            status: m.check.status
          }
        })),
        createdAt: statusPage.createdAt,
        updatedAt: statusPage.updatedAt
      }
    };

    // URL pública
    const frontendUrl = process.env.FRONTEND_URL || 'https://ankapulse.app';
    const publicUrl = `${frontendUrl}/status/${statusPage.slug}`;

    res.json({
      ...response,
      publicUrl
    });

  } catch (error) {
    console.error('Error fetching status page config:', error);
    res.status(500).json({ error: 'Failed to fetch status page config' });
  }
}

// ====================================================
// VER STATUS PAGE PÚBLICO (SIN AUTH)
// ====================================================
export async function getPublicStatusPage(req: Request, res: Response): Promise<void> {
  try {
    const { slug } = req.params;

    if (!slug) {
      res.status(400).json({ error: 'Slug is required' });
      return;
    }

    const statusPage = await statusPageService.getPublicStatusPage(slug);

    if (!statusPage) {
      res.status(404).json({ 
        error: 'Status page not found or disabled',
        success: false 
      });
      return;
    }

    res.json({
      success: true,
      data: statusPage
    });

  } catch (error) {
    console.error('Error fetching public status page:', error);
    res.status(500).json({ error: 'Failed to fetch status page' });
  }
}

// ====================================================
// DESHABILITAR STATUS PAGE (PRIVADO)
// ====================================================
export async function disableStatusPage(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user?.sub || req.user?.userId;

    if (!userId) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }

    await statusPageService.disableStatusPage(userId);

    res.json({
      success: true,
      message: 'Status page disabled successfully'
    });

  } catch (error: any) {
    console.error('Error disabling status page:', error);
    
    if (error.message.includes('no encontrado')) {
      res.status(404).json({ error: 'Status page not found' });
      return;
    }

    res.status(500).json({ error: 'Failed to disable status page' });
  }
}

// ====================================================
// VERIFICAR DISPONIBILIDAD DE SLUG (PRIVADO)
// ====================================================
export async function checkSlugAvailability(req: Request, res: Response): Promise<void> {
  try {
    const { slug } = req.params;
    const userId = req.user?.sub || req.user?.userId;

    if (!slug) {
      res.status(400).json({ error: 'Slug is required' });
      return;
    }

    const isAvailable = await statusPageService.isSlugAvailable(slug, userId);

    res.json({
      success: true,
      available: isAvailable,
      slug
    });

  } catch (error) {
    console.error('Error checking slug availability:', error);
    res.status(500).json({ error: 'Failed to check slug availability' });
  }
}