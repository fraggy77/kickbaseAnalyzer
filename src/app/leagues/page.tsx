import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    // Extract token from Authorization header
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { message: 'Authorization header missing or invalid' },
        { status: 401 }
      );
    }
    
    const token = authHeader.split(' ')[1];
    
    // Make request to Kickbase API to get leagues
    const response = await fetch('https://api.kickbase.de/v4/user/leagues', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Kickbase Analyzer',
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: response.statusText }));
      return NextResponse.json(
        { message: `Failed to fetch leagues: ${errorData.message || response.statusText}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Leagues fetch error:', error);
    return NextResponse.json(
      { message: error.message || 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}