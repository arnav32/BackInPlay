import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import exercisesData from '@/data/exercises.json';

const anthropic = new Anthropic();

export async function POST(request: NextRequest) {
  try {
    const { painDescription } = await request.json();

    if (!painDescription || typeof painDescription !== 'string') {
      return NextResponse.json(
        { error: 'Pain description is required' },
        { status: 400 }
      );
    }

    const exerciseList = exercisesData.exercises
      .map((ex) => `- ID: "${ex.id}", Name: "${ex.name}", Ailments: [${ex.ailments.join(', ')}], Description: ${ex.description}`)
      .join('\n');

    const prompt = `You are a physiotherapy exercise selector. Based on the user's description of their pain or injury, select the BEST matching exercise from the list below.

AVAILABLE EXERCISES:
${exerciseList}

USER'S PAIN/INJURY DESCRIPTION:
"${painDescription}"

RULES:
1. You MUST select ONLY from the exercises listed above.
2. Match based on the ailments array and description.
3. If no exercise reasonably matches the user's condition, respond with exactly: NO_MATCH
4. If you find a match, respond with ONLY the exercise ID (e.g., "shoulder_flexion") and nothing else.

Your response (exercise ID only, or NO_MATCH):`;

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 50,
      messages: [{ role: 'user', content: prompt }],
    });

    const responseText = message.content[0].type === 'text' 
      ? message.content[0].text.trim() 
      : '';

    if (responseText === 'NO_MATCH') {
      return NextResponse.json({
        success: false,
        message: 'No exercise found for your ailment. Please describe your pain differently or consult a healthcare provider.',
      });
    }

    const selectedExercise = exercisesData.exercises.find(
      (ex) => ex.id === responseText
    );

    if (!selectedExercise) {
      return NextResponse.json({
        success: false,
        message: 'No exercise found for your ailment. Please try describing your symptoms differently.',
      });
    }

    return NextResponse.json({
      success: true,
      exercise: selectedExercise,
    });
  } catch (error) {
    console.error('Exercise selection error:', error);
    return NextResponse.json(
      { error: 'Failed to select exercise' },
      { status: 500 }
    );
  }
}
