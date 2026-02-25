export type RiskLevel = "LOW" | "MEDIUM" | "HIGH";

export interface RiskAction {
  type: "nutrition" | "health_camp" | "parent_counseling";
  priority: "low" | "medium" | "high";
  title: string;
  recommendation: string;
  tasks: string[];
  parentScript: string;
}

const uniqueByType = (actions: RiskAction[]): RiskAction[] => {
  const byType = new Map<RiskAction["type"], RiskAction>();
  for (const action of actions) {
    const existing = byType.get(action.type);
    if (!existing) {
      byType.set(action.type, action);
      continue;
    }
    const score = { low: 1, medium: 2, high: 3 };
    if (score[action.priority] > score[existing.priority]) {
      byType.set(action.type, action);
    }
  }
  return Array.from(byType.values());
};

const baseParentScript = (priority: string): string =>
  `Namaste. School health team noticed ${priority} risk indicators. Please coordinate with school support this week for a follow-up plan.`;

const byReasonCode: Record<string, RiskAction[]> = {
  BMI_OUT_OF_HEALTHY_RANGE: [
    {
      type: "nutrition",
      priority: "high",
      title: "Nutrition counseling and meal plan",
      recommendation:
        "Schedule nutrition counseling and align the child meal plan with age-appropriate calorie and protein needs.",
      tasks: [
        "Conduct BMI re-check within 14 days",
        "Start school nutrition follow-up register",
        "Share weekly diet checklist with guardian"
      ],
      parentScript:
        "Namaste. Your child needs nutrition follow-up. Please meet school counselor this week and share meal pattern details."
    },
    {
      type: "health_camp",
      priority: "medium",
      title: "Medical camp screening",
      recommendation:
        "Refer student to the next health camp for anthropometry and pediatric screening.",
      tasks: [
        "Mark student for next health camp",
        "Record camp findings in student profile",
        "Plan follow-up check after camp"
      ],
      parentScript:
        "Namaste. Please allow your child to attend the upcoming school health camp for a complete screening."
    }
  ],
  LOW_ATTENDANCE_PATTERN: [
    {
      type: "parent_counseling",
      priority: "high",
      title: "Attendance counseling with guardian",
      recommendation:
        "Conduct parent counseling to identify attendance barriers and agree a 2-week attendance target.",
      tasks: [
        "Call guardian within 48 hours",
        "Document attendance barriers and support needed",
        "Track daily attendance for next 14 days"
      ],
      parentScript:
        "Namaste. We observed low attendance affecting health follow-up. Please connect with class teacher to restore regular attendance."
    }
  ],
  VACCINATION_DELAY_OR_INCOMPLETE: [
    {
      type: "health_camp",
      priority: "high",
      title: "Vaccination catch-up referral",
      recommendation:
        "Refer student to immunization camp and complete pending vaccine schedule in coordination with local health workers.",
      tasks: [
        "Check pending vaccines against age schedule",
        "Issue referral note for camp/PHC",
        "Verify vaccination status update in record"
      ],
      parentScript:
        "Namaste. Your child has pending vaccination. Please visit the assigned camp/PHC and share completion proof with school."
    }
  ],
  AIR_QUALITY_EXPOSURE: [
    {
      type: "health_camp",
      priority: "medium",
      title: "Respiratory risk screening",
      recommendation:
        "Enroll student in respiratory screening and minimize outdoor exposure during high AQI periods.",
      tasks: [
        "Tag student for respiratory check in camp",
        "Follow clean-air classroom protocol",
        "Review symptoms after high-AQI days"
      ],
      parentScript:
        "Namaste. Air quality risk is high in your area. Please monitor breathing symptoms and keep child indoor during peak pollution hours."
    }
  ],
  HEAT_STRESS_RISK: [
    {
      type: "parent_counseling",
      priority: "medium",
      title: "Heat safety counseling",
      recommendation:
        "Provide hydration and heat-safety guidance to family and adjust outdoor activity timing.",
      tasks: [
        "Share heat safety checklist",
        "Ensure hydration break protocol in school",
        "Review symptoms during heat alert days"
      ],
      parentScript:
        "Namaste. Heat levels are high. Please ensure water intake, light clothing, and avoid afternoon outdoor exposure."
    }
  ]
};

export const mapRiskToActions = (params: {
  riskLevel: RiskLevel;
  reasonCodes: string[];
}): RiskAction[] => {
  const mapped = params.reasonCodes.flatMap((code) => byReasonCode[code] ?? []);
  let actions = uniqueByType(mapped);

  if (actions.length === 0) {
    actions = [
      {
        type: "parent_counseling",
        priority: "low",
        title: "Routine preventive counseling",
        recommendation:
          "Continue regular preventive care and monitor attendance, nutrition, and seasonal health factors.",
        tasks: [
          "Share monthly preventive care advisory",
          "Track attendance and wellbeing indicators",
          "Reassess risk profile in next cycle"
        ],
        parentScript: baseParentScript("low")
      }
    ];
  }

  if (params.riskLevel === "HIGH" && !actions.some((a) => a.type === "parent_counseling")) {
    actions.push({
      type: "parent_counseling",
      priority: "high",
      title: "Urgent parent counseling",
      recommendation:
        "Arrange urgent parent counseling to agree immediate follow-up actions and referral timeline.",
      tasks: [
        "Call guardian same day",
        "Schedule counselor call/visit within 24 hours",
        "Create written follow-up plan with dates"
      ],
      parentScript:
        "Namaste. This is an urgent school health update. Please contact the school health desk today to finalize next steps."
    });
  }

  return uniqueByType(actions);
};
