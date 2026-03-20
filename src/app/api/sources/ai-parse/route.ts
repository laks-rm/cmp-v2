import { NextRequest, NextResponse } from 'next/server'

// Mock AI parsing endpoint
// This will be replaced with real AI integration in Phase 2
export async function POST(request: NextRequest) {
  try {
    // Simulate processing delay
    await new Promise((resolve) => setTimeout(resolve, 2000))

    // Return mock AI-parsed data
    const mockData = {
      success: true,
      data: {
        suggested_title: 'GDPR Data Protection Regulation',
        suggested_type: 'REGULATION',
        suggested_category: 'DATA_PROTECTION',
        suggested_description:
          'The General Data Protection Regulation (EU) 2016/679 is a regulation in EU law on data protection and privacy in the European Union and the European Economic Area.',
        clauses: [
          {
            clause_number: 'Art.15',
            title: 'Right of Access by the Data Subject',
            description:
              'The data subject shall have the right to obtain from the controller confirmation as to whether or not personal data concerning him or her are being processed, and, where that is the case, access to the personal data.',
            suggested_tasks: [
              {
                title: 'Process data subject access requests',
                description: 'Review and respond to all data subject access requests within 30 days',
                frequency: 'MONTHLY',
                review_required: true,
                evidence_required: true,
                expected_outcome: 'All access requests processed within statutory timeframe',
                priority: 'HIGH',
              },
            ],
          },
          {
            clause_number: 'Art.17',
            title: 'Right to Erasure (Right to be Forgotten)',
            description:
              'The data subject shall have the right to obtain from the controller the erasure of personal data concerning him or her without undue delay.',
            suggested_tasks: [
              {
                title: 'Process erasure requests',
                description: 'Review and action data erasure requests, ensuring deletion across all systems',
                frequency: 'QUARTERLY',
                review_required: true,
                evidence_required: true,
                expected_outcome: 'Valid erasure requests completed with audit trail',
                priority: 'HIGH',
              },
            ],
          },
          {
            clause_number: 'Art.32',
            title: 'Security of Processing',
            description:
              'The controller and the processor shall implement appropriate technical and organisational measures to ensure a level of security appropriate to the risk.',
            suggested_tasks: [
              {
                title: 'Review security measures',
                description: 'Conduct quarterly review of technical and organizational security measures',
                frequency: 'QUARTERLY',
                review_required: true,
                evidence_required: true,
                expected_outcome: 'Security controls reviewed and documented',
                priority: 'HIGH',
              },
            ],
          },
        ],
        confidence_score: 0.92,
        warnings: [],
      },
    }

    return NextResponse.json(mockData, { status: 200 })
  } catch (error) {
    console.error('AI parse error:', error)

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An error occurred while parsing the document',
        },
      },
      { status: 500 }
    )
  }
}
