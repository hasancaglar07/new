// frontend/src/app/api/google-tts/route.js

import { NextResponse } from 'next/server';
import { TextToSpeechClient } from '@google-cloud/text-to-speech';

// POST /api/google-tts
export async function POST(request) {
  try {
    // Get Google credentials from environment
    const credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
    const projectId = process.env.GOOGLE_PROJECT_ID;
    
    if (!credentialsPath || !projectId) {
      return NextResponse.json(
        { error: 'Google TTS credentials not configured' },
        { status: 500 }
      );
    }
    
    // Parse request body
    const {
      text,
      languageCode = 'tr-TR', // Turkish
      voiceName = 'tr-TR-Wavenet-E', // Turkish female voice
      audioEncoding = 'MP3'
    } = await request.json();
    
    if (!text || text.trim().length === 0) {
      return NextResponse.json(
        { error: 'Text is required' },
        { status: 400 }
      );
    }
    
    // Validate text length (Google TTS has limits)
    if (text.length > 5000) {
      return NextResponse.json(
        { error: 'Text is too long (max 5000 characters)' },
        { status: 400 }
      );
    }
    
    // Initialize Google TTS client with service account
     const client = new TextToSpeechClient({
       keyFilename: credentialsPath,
       projectId: projectId
     });
     
     // Construct the request
     const ttsRequest = {
       input: { text: text },
       voice: {
         languageCode: languageCode,
         name: voiceName,
         ssmlGender: 'FEMALE'
       },
       audioConfig: {
         audioEncoding: audioEncoding,
         speakingRate: 0.9,
         pitch: 0.0,
         volumeGainDb: 0.0
       }
     };
     
     // Perform the text-to-speech request
     const [response] = await client.synthesizeSpeech(ttsRequest);
     
     if (!response.audioContent) {
       return NextResponse.json(
         { error: 'Failed to generate audio' },
         { status: 500 }
       );
     }
     
     // Return audio as response
     return new NextResponse(response.audioContent, {
       status: 200,
       headers: {
         'Content-Type': 'audio/mpeg',
         'Content-Length': response.audioContent.length.toString(),
         'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
         'Access-Control-Allow-Origin': '*'
       }
     });
    
  } catch (error) {
    console.error('Google TTS API error:', error);
    
    // Handle specific Google TTS errors
    if (error.code === 'UNAUTHENTICATED') {
      return NextResponse.json(
        { error: 'Google TTS authentication failed' },
        { status: 401 }
      );
    }
    
    if (error.code === 'QUOTA_EXCEEDED') {
      return NextResponse.json(
        { error: 'Google TTS quota exceeded' },
        { status: 429 }
      );
    }
    
    return NextResponse.json(
      { 
        error: 'Internal server error', 
        details: error.message 
      },
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