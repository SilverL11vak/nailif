import { NextResponse } from 'next/server';
import { 
  ensureSessionTables, 
  getSessionData, 
  saveSessionData, 
  deleteSessionData,
  cleanupExpiredSessions,
  type SessionDataType 
} from '@/lib/session';

export const dynamic = 'force-dynamic';

// Helper to get session ID from cookie header
function getSessionIdFromRequest(request: Request): string | null {
  const cookieHeader = request.headers.get('cookie');
  if (!cookieHeader) return null;
  
  const match = cookieHeader.match(/nailify_session=([^;]+)/);
  return match ? match[1] : null;
}

// GET /api/session - Get all session data
export async function GET(request: Request) {
  try {
    const sessionId = getSessionIdFromRequest(request);
    
    // If no session, return empty (client will create one)
    if (!sessionId) {
      return NextResponse.json({ 
        favorites: null, 
        cart: null, 
        bookingProgress: null 
      });
    }
    
    await ensureSessionTables();
    
    // Run lazy cleanup (lightweight)
    await cleanupExpiredSessions(10);
    
    const [favorites, cart, bookingProgress] = await Promise.all([
      getSessionData<string[]>(sessionId, 'favorites'),
      getSessionData<{ items: Array<{ productId: string; quantity: number; price?: number; addedAt: string }> }>(sessionId, 'cart'),
      getSessionData<unknown>(sessionId, 'booking_progress'),
    ]);
    
    return NextResponse.json({ 
      favorites, 
      cart, 
      bookingProgress 
    });
  } catch (error) {
    console.error('GET /api/session error:', error);
    return NextResponse.json({ error: 'Failed to load session' }, { status: 500 });
  }
}

// PUT /api/session - Save session data
export async function PUT(request: Request) {
  try {
    const sessionId = getSessionIdFromRequest(request);
    
    if (!sessionId) {
      return NextResponse.json({ error: 'No session' }, { status: 400 });
    }
    
    const body = await request.json();
    const { type, key, value } = body as { 
      type: SessionDataType; 
      key?: string; 
      value: unknown 
    };
    
    if (!type) {
      return NextResponse.json({ error: 'Missing type' }, { status: 400 });
    }
    
    await ensureSessionTables();
    await saveSessionData(sessionId, type, key || '', value);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('PUT /api/session error:', error);
    return NextResponse.json({ error: 'Failed to save session' }, { status: 500 });
  }
}

// DELETE /api/session - Clear session data
export async function DELETE(request: Request) {
  try {
    const sessionId = getSessionIdFromRequest(request);
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') as SessionDataType | null;
    
    if (!sessionId) {
      return NextResponse.json({ error: 'No session' }, { status: 400 });
    }
    
    await ensureSessionTables();
    await deleteSessionData(sessionId, type || undefined);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/session error:', error);
    return NextResponse.json({ error: 'Failed to clear session' }, { status: 500 });
  }
}
