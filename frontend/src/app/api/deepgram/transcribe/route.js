// frontend/src/app/api/deepgram/transcribe/route.js

import { NextResponse } from 'next/server';
import { createClient } from '@deepgram/sdk';

// POST /api/deepgram/transcribe
export async function POST(request) {
  try {
    // Get Deepgram API key from environment
    const apiKey = process.env.DEEPGRAM_API_KEY;
    
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Deepgram API key not configured' },
        { status: 500 }
      );
    }
    
    // Get audio file from form data
    const formData = await request.formData();
    const audioFile = formData.get('audio');
    
    if (!audioFile) {
      return NextResponse.json(
        { error: 'No audio file provided' },
        { status: 400 }
      );
    }
    
    // Convert file to buffer
    const audioBuffer = await audioFile.arrayBuffer();
    const audioData = new Uint8Array(audioBuffer);
    
    // Create Deepgram client
    const deepgram = createClient(apiKey);
    
    // Transcription options
    const options = {
      model: 'nova-2',
      language: 'tr',
      smart_format: true,
      punctuate: true,
      diarize: false,
      encoding: 'webm',
      sample_rate: 48000
    };
    
    // Perform transcription
    const response = await deepgram.listen.prerecorded.transcribeFile(
      audioData,
      options
    );
    
    // Extract transcript
    const transcript = response.result?.results?.channels?.[0]?.alternatives?.[0]?.transcript || '';
    
    // Get confidence score
    const confidence = response.result?.results?.channels?.[0]?.alternatives?.[0]?.confidence || 0;
    
    // Get word-level timestamps if available
    const words = response.result?.results?.channels?.[0]?.alternatives?.[0]?.words || [];
    
    return NextResponse.json({
      transcript,
      confidence,
      words,
      metadata: {
        duration: response.result?.metadata?.duration || 0,
        channels: response.result?.metadata?.channels || 1,
        model_info: response.result?.metadata?.model_info || {}
      }
    });
    
  } catch (error) {
    console.error('Deepgram transcription error:', error);
    
    // Handle specific Deepgram errors
    if (error.message?.includes('401')) {
      return NextResponse.json(
        { error: 'Deepgram API key is invalid' },
        { status: 401 }
      );
    }
    
    if (error.message?.includes('402')) {
      return NextResponse.json(
        { error: 'Deepgram account has insufficient credits' },
        { status: 402 }
      );
    }
    
    if (error.message?.includes('413')) {
      return NextResponse.json(
        { error: 'Audio file is too large' },
        { status: 413 }
      );
    }
    
    return NextResponse.json(
      { 
        error: 'Transcription failed', 
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