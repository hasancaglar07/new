// frontend/src/app/api/deepgram/token/route.js

import { NextResponse } from 'next/server';
import { createClient } from '@deepgram/sdk';

// POST /api/deepgram/token
export async function POST() {
  try {
    // Get Deepgram API key from environment
    const apiKey = process.env.DEEPGRAM_API_KEY;
    
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Deepgram API key not configured' },
        { status: 500 }
      );
    }
    
    // Create Deepgram client
    const deepgram = createClient(apiKey);
    
    // Create a temporary project key for client-side use
    // This is more secure than exposing the main API key
    const projectId = process.env.DEEPGRAM_PROJECT_ID;
    
    if (projectId) {
      try {
        // Create a temporary key with limited scope
        const keyResponse = await deepgram.manage.createProjectKey(
          projectId,
          {
            comment: 'Temporary key for chat application',
            scopes: ['usage:write'],
            time_to_live_in_seconds: 3600 // 1 hour
          }
        );
        
        return NextResponse.json({
          key: keyResponse.key,
          expires_at: keyResponse.expires_at
        });
      } catch (error) {
        console.error('Failed to create temporary key:', error);
        // Fallback to main API key (less secure but functional)
        return NextResponse.json({ key: apiKey });
      }
    } else {
      // If no project ID, return the main API key
      // Note: In production, you should use temporary keys
      return NextResponse.json({ key: apiKey });
    }
    
  } catch (error) {
    console.error('Deepgram token error:', error);
    return NextResponse.json(
      { error: 'Failed to generate Deepgram token' },
      { status: 500 }
    );
  }
}

// Handle OPTIONS for CORS
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}