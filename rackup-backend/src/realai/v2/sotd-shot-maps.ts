/**
 * Structured Shot-of-the-Day maps for all 52 catalogue shots.
 * Internal geometry only (x 0–100 head→foot, y 0–50 near→far). Offline-safe Rack catalogue.
 * Frontend renders instructor-style diagrams with original drill tokens (not cards),
 * dual paths (cue + object), real ball colors, and human coaching — never raw coords/legends.
 * Geometry is validated locally (sotd-shot-map-geometry.ts), physics by sotd-route-audit.ts,
 * and text agreement by sotd-text-consistency.ts. Do not generate maps via RealAI.
 * Regenerate with: npx ts-node -T scripts/generate-sotd-maps.ts
 */

export type SotdPoint = { x: number; y: number };

export type SotdGhostBall = SotdPoint & {
  radius?: number;
  show?: boolean;
};

export type SotdObjectBall = SotdPoint & {
  ballId: number;
  role?: 'object' | 'blocker' | 'prop' | 'helper';
};

export type SotdPathStyle = 'solid' | 'dashed';
export type SotdPathKind = 'ground' | 'airborne' | 'object' | 'cue_after';

export type SotdPathSegment = {
  from: SotdPoint;
  to: SotdPoint;
  style?: SotdPathStyle;
  kind?: SotdPathKind;
};

export type SotdEnglish = {
  tip_zone: string;
  sidespin: number;
  backspin: number;
  follow: number;
  label: string;
};

export type SotdLandingZone = SotdPoint & { label: string };

export type SotdMapSource = 'catalogue' | 'realai';

/** pocket (default): OB to pocket_target · spot: OB stops on pocket_target · path: CB-only tour. */
export type SotdShotGoal = 'pocket' | 'spot' | 'path';

/** Another ball the shot moves on purpose (cluster split, butterfly wing, mirror bank). */
export type SotdExtraObjectPath = { ballId: number; pts: SotdPoint[]; faded?: boolean };

export type SotdShotMap = {
  id: string;
  name: string;
  difficulty: string;
  difficulty_rating: number;
  category: string;
  speed_category: string;
  tip_zone: string;
  cue_ball_start: SotdPoint;
  object_ball_positions: SotdObjectBall[];
  intended_path: SotdPathSegment[];
  english: SotdEnglish;
  landing_zones: SotdLandingZone[];
  pocket_target: SotdPoint;
  /** Omit for a normal pot. */
  shot_goal?: SotdShotGoal;
  extra_object_paths?: SotdExtraObjectPath[];
  /** Rare pin — omit so SPA derives ghost = OB − normalize(aim − OB)×4.4 */
  ghost_ball?: SotdGhostBall;
  /** Rare pin — omit so SPA uses midpoint(ghost, OB). */
  contact_point?: SotdPoint;
  coordinate_system: { x: string; y: string; units: string };
  source: SotdMapSource;
  ascii_table: string;
};

export const SOTD_SHOT_MAPS: SotdShotMap[] = [
  {
    "id": "sotd-01",
    "name": "Rail-First Bank Cross",
    "difficulty": "Medium",
    "difficulty_rating": 2,
    "category": "bank",
    "speed_category": "medium",
    "tip_zone": "center",
    "cue_ball_start": {
      "x": 87.5,
      "y": 25
    },
    "object_ball_positions": [
      {
        "ballId": 1,
        "x": 75,
        "y": 2.3,
        "role": "object"
      }
    ],
    "intended_path": [
      {
        "from": {
          "x": 87.5,
          "y": 25
        },
        "to": {
          "x": 75,
          "y": 2.3
        }
      },
      {
        "from": {
          "x": 75,
          "y": 2.3
        },
        "to": {
          "x": 73.9,
          "y": 0
        }
      },
      {
        "from": {
          "x": 73.9,
          "y": 0
        },
        "to": {
          "x": 50,
          "y": 50
        }
      }
    ],
    "english": {
      "tip_zone": "center",
      "sidespin": 0,
      "backspin": 0,
      "follow": 0,
      "label": "none"
    },
    "landing_zones": [
      {
        "x": 50,
        "y": 50,
        "label": "pocket"
      },
      {
        "x": 76.7,
        "y": 5.9,
        "label": "cb_rest"
      }
    ],
    "pocket_target": {
      "x": 50,
      "y": 50
    },
    "ghost_ball": {
      "x": 76.9,
      "y": 6.3,
      "show": false
    },
    "coordinate_system": {
      "x": "0=head rail → 100=foot rail",
      "y": "0=bottom long rail → 50=top long rail",
      "units": "normalized table percent (9-foot aspect 2:1)"
    },
    "source": "catalogue",
    "ascii_table": "O───────────────────────────────────────O\n│                   O                   │\n│                    ·                  │\n│                    ·                  │\n│                     ··                │\n│                      ·                │\n│                       ·               │\n│                        ·        C     │\n│                        ·       ·      │\n│                         ·      ·      │\n│                         ··    ·       │\n│                           ·  ·        │\n│                           · 1         │\n│                            ·          │\nO───────────────────────────────────────O\nLegend: C=cue  1-9=object  H=helper  X=blocker  O=pocket  ·=path"
  },
  {
    "id": "sotd-02",
    "name": "Stop-Shot Ladder",
    "difficulty": "Easy",
    "difficulty_rating": 1,
    "category": "position",
    "speed_category": "soft",
    "tip_zone": "center",
    "cue_ball_start": {
      "x": 66.2,
      "y": 33.8
    },
    "object_ball_positions": [
      {
        "ballId": 1,
        "x": 75,
        "y": 25,
        "role": "object"
      }
    ],
    "intended_path": [
      {
        "from": {
          "x": 66.2,
          "y": 33.8
        },
        "to": {
          "x": 75,
          "y": 25
        }
      },
      {
        "from": {
          "x": 75,
          "y": 25
        },
        "to": {
          "x": 100,
          "y": 0
        }
      }
    ],
    "english": {
      "tip_zone": "center",
      "sidespin": 0,
      "backspin": 0,
      "follow": 0,
      "label": "none"
    },
    "landing_zones": [
      {
        "x": 100,
        "y": 0,
        "label": "pocket"
      },
      {
        "x": 72.2,
        "y": 27.8,
        "label": "cb_rest"
      }
    ],
    "pocket_target": {
      "x": 100,
      "y": 0
    },
    "coordinate_system": {
      "x": "0=head rail → 100=foot rail",
      "y": "0=bottom long rail → 50=top long rail",
      "units": "normalized table percent (9-foot aspect 2:1)"
    },
    "source": "catalogue",
    "ascii_table": "O───────────────────────────────────────O\n│                                       │\n│                                       │\n│                                       │\n│                                       │\n│                         C             │\n│                          ··           │\n│                             1         │\n│                              ··       │\n│                                ·      │\n│                                 ··    │\n│                                   ·   │\n│                                    ·· │\n│                                      O│\nO───────────────────────────────────────O\nLegend: C=cue  1-9=object  H=helper  X=blocker  O=pocket  ·=path"
  },
  {
    "id": "sotd-03",
    "name": "Draw Back Two Diamonds",
    "difficulty": "Medium",
    "difficulty_rating": 2,
    "category": "position",
    "speed_category": "soft",
    "tip_zone": "6-low",
    "cue_ball_start": {
      "x": 66.2,
      "y": 33.8
    },
    "object_ball_positions": [
      {
        "ballId": 1,
        "x": 75,
        "y": 25,
        "role": "object"
      }
    ],
    "intended_path": [
      {
        "from": {
          "x": 66.2,
          "y": 33.8
        },
        "to": {
          "x": 75,
          "y": 25
        }
      },
      {
        "from": {
          "x": 75,
          "y": 25
        },
        "to": {
          "x": 100,
          "y": 0
        }
      }
    ],
    "english": {
      "tip_zone": "6-low",
      "sidespin": 0,
      "backspin": 0.75,
      "follow": 0,
      "label": "draw"
    },
    "landing_zones": [
      {
        "x": 100,
        "y": 0,
        "label": "pocket"
      },
      {
        "x": 60.7,
        "y": 39.3,
        "label": "cb_rest"
      }
    ],
    "pocket_target": {
      "x": 100,
      "y": 0
    },
    "coordinate_system": {
      "x": "0=head rail → 100=foot rail",
      "y": "0=bottom long rail → 50=top long rail",
      "units": "normalized table percent (9-foot aspect 2:1)"
    },
    "source": "catalogue",
    "ascii_table": "O───────────────────────────────────────O\n│                                       │\n│                                       │\n│                                       │\n│                                       │\n│                         C             │\n│                          ··           │\n│                             1         │\n│                              ··       │\n│                                ·      │\n│                                 ··    │\n│                                   ·   │\n│                                    ·· │\n│                                      O│\nO───────────────────────────────────────O\nLegend: C=cue  1-9=object  H=helper  X=blocker  O=pocket  ·=path"
  },
  {
    "id": "sotd-04",
    "name": "Follow Into the Stack",
    "difficulty": "Easy",
    "difficulty_rating": 1,
    "category": "position",
    "speed_category": "medium",
    "tip_zone": "12-high",
    "cue_ball_start": {
      "x": 24.5,
      "y": 19
    },
    "object_ball_positions": [
      {
        "ballId": 1,
        "x": 76,
        "y": 36,
        "role": "object"
      },
      {
        "ballId": 2,
        "x": 85,
        "y": 33.6,
        "role": "prop"
      },
      {
        "ballId": 3,
        "x": 87.3,
        "y": 33.4,
        "role": "prop"
      }
    ],
    "intended_path": [
      {
        "from": {
          "x": 24.5,
          "y": 19
        },
        "to": {
          "x": 76,
          "y": 36
        }
      },
      {
        "from": {
          "x": 76,
          "y": 36
        },
        "to": {
          "x": 100,
          "y": 50
        }
      }
    ],
    "english": {
      "tip_zone": "12-high",
      "sidespin": 0,
      "backspin": 0,
      "follow": 0.7,
      "label": "follow"
    },
    "landing_zones": [
      {
        "x": 100,
        "y": 50,
        "label": "pocket"
      },
      {
        "x": 82.2,
        "y": 33.8,
        "label": "cb_rest"
      }
    ],
    "pocket_target": {
      "x": 100,
      "y": 50
    },
    "coordinate_system": {
      "x": "0=head rail → 100=foot rail",
      "y": "0=bottom long rail → 50=top long rail",
      "units": "normalized table percent (9-foot aspect 2:1)"
    },
    "source": "catalogue",
    "ascii_table": "O───────────────────────────────────────O\n│                                     ·O│\n│                                  ··   │\n│                               · ·     │\n│                             1·        │\n│                         ···    23     │\n│                   ·· ··               │\n│               ·· ·                    │\n│         C ·· ·                        │\n│                                       │\n│                                       │\n│                                       │\n│                                       │\n│                                       │\nO───────────────────────────────────────O\nLegend: C=cue  1-9=object  H=helper  X=blocker  O=pocket  ·=path"
  },
  {
    "id": "sotd-05",
    "name": "Inside English Cut",
    "difficulty": "Hard",
    "difficulty_rating": 3,
    "category": "curve",
    "speed_category": "soft",
    "tip_zone": "3-right",
    "cue_ball_start": {
      "x": 64.4,
      "y": 20.3
    },
    "object_ball_positions": [
      {
        "ballId": 1,
        "x": 90,
        "y": 12,
        "role": "object"
      }
    ],
    "intended_path": [
      {
        "from": {
          "x": 64.4,
          "y": 20.3
        },
        "to": {
          "x": 90,
          "y": 12
        }
      },
      {
        "from": {
          "x": 90,
          "y": 12
        },
        "to": {
          "x": 100,
          "y": 0
        }
      }
    ],
    "english": {
      "tip_zone": "3-right",
      "sidespin": 0.65,
      "backspin": 0,
      "follow": 0,
      "label": "right"
    },
    "landing_zones": [
      {
        "x": 100,
        "y": 0,
        "label": "pocket"
      },
      {
        "x": 93.9,
        "y": 18.2,
        "label": "cb_rest"
      }
    ],
    "pocket_target": {
      "x": 100,
      "y": 0
    },
    "coordinate_system": {
      "x": "0=head rail → 100=foot rail",
      "y": "0=bottom long rail → 50=top long rail",
      "units": "normalized table percent (9-foot aspect 2:1)"
    },
    "source": "catalogue",
    "ascii_table": "O───────────────────────────────────────O\n│                                       │\n│                                       │\n│                                       │\n│                                       │\n│                                       │\n│                                       │\n│                                       │\n│                        C ·            │\n│                           · ··        │\n│                               · ·1    │\n│                                   ·   │\n│                                    ·· │\n│                                      O│\nO───────────────────────────────────────O\nLegend: C=cue  1-9=object  H=helper  X=blocker  O=pocket  ·=path"
  },
  {
    "id": "sotd-06",
    "name": "Outside English Hold",
    "difficulty": "Hard",
    "difficulty_rating": 3,
    "category": "position",
    "speed_category": "medium",
    "tip_zone": "9-left",
    "cue_ball_start": {
      "x": 65.1,
      "y": 22.4
    },
    "object_ball_positions": [
      {
        "ballId": 1,
        "x": 90,
        "y": 12,
        "role": "object"
      }
    ],
    "intended_path": [
      {
        "from": {
          "x": 65.1,
          "y": 22.4
        },
        "to": {
          "x": 90,
          "y": 12
        }
      },
      {
        "from": {
          "x": 90,
          "y": 12
        },
        "to": {
          "x": 100,
          "y": 0
        }
      }
    ],
    "english": {
      "tip_zone": "9-left",
      "sidespin": -0.65,
      "backspin": 0,
      "follow": 0,
      "label": "left"
    },
    "landing_zones": [
      {
        "x": 100,
        "y": 0,
        "label": "pocket"
      },
      {
        "x": 93.9,
        "y": 18.2,
        "label": "cb_rest"
      }
    ],
    "pocket_target": {
      "x": 100,
      "y": 0
    },
    "coordinate_system": {
      "x": "0=head rail → 100=foot rail",
      "y": "0=bottom long rail → 50=top long rail",
      "units": "normalized table percent (9-foot aspect 2:1)"
    },
    "source": "catalogue",
    "ascii_table": "O───────────────────────────────────────O\n│                                       │\n│                                       │\n│                                       │\n│                                       │\n│                                       │\n│                                       │\n│                                       │\n│                         C··           │\n│                             ···       │\n│                                 ·1    │\n│                                   ·   │\n│                                    ·· │\n│                                      O│\nO───────────────────────────────────────O\nLegend: C=cue  1-9=object  H=helper  X=blocker  O=pocket  ·=path"
  },
  {
    "id": "sotd-07",
    "name": "Two-Rail Kick to Corner",
    "difficulty": "Hard",
    "difficulty_rating": 3,
    "category": "kick",
    "speed_category": "firm",
    "tip_zone": "center",
    "cue_ball_start": {
      "x": 14,
      "y": 40
    },
    "object_ball_positions": [
      {
        "ballId": 1,
        "x": 84,
        "y": 38,
        "role": "object"
      }
    ],
    "intended_path": [
      {
        "from": {
          "x": 14,
          "y": 40
        },
        "to": {
          "x": 21.1,
          "y": 50
        }
      },
      {
        "from": {
          "x": 21.1,
          "y": 50
        },
        "to": {
          "x": 56.3,
          "y": 0
        }
      },
      {
        "from": {
          "x": 56.3,
          "y": 0
        },
        "to": {
          "x": 84,
          "y": 38
        }
      },
      {
        "from": {
          "x": 84,
          "y": 38
        },
        "to": {
          "x": 100,
          "y": 50
        }
      }
    ],
    "english": {
      "tip_zone": "center",
      "sidespin": 0,
      "backspin": 0,
      "follow": 0,
      "label": "none"
    },
    "landing_zones": [
      {
        "x": 100,
        "y": 50,
        "label": "pocket"
      },
      {
        "x": 78,
        "y": 42.3,
        "label": "cb_rest"
      }
    ],
    "pocket_target": {
      "x": 100,
      "y": 50
    },
    "coordinate_system": {
      "x": "0=head rail → 100=foot rail",
      "y": "0=bottom long rail → 50=top long rail",
      "units": "normalized table percent (9-foot aspect 2:1)"
    },
    "source": "catalogue",
    "ascii_table": "O───────────────────────────────────────O\n│                                      O│\n│       · ·                          ·· │\n│     C·   ··                     ··    │\n│            ·                   1      │\n│            ·                 ··       │\n│             ·               ·         │\n│              ··            ·          │\n│                ·          ··          │\n│                 ·        ·            │\n│                  ·      ·             │\n│                   ··  ··              │\n│                     ··                │\n│                                       │\nO───────────────────────────────────────O\nLegend: C=cue  1-9=object  H=helper  X=blocker  O=pocket  ·=path"
  },
  {
    "id": "sotd-08",
    "name": "Simple Combo: Spot to Corner",
    "difficulty": "Easy",
    "difficulty_rating": 1,
    "category": "combo",
    "speed_category": "soft",
    "tip_zone": "center",
    "cue_ball_start": {
      "x": 66.2,
      "y": 16.2
    },
    "object_ball_positions": [
      {
        "ballId": 1,
        "x": 75,
        "y": 25,
        "role": "object"
      },
      {
        "ballId": 2,
        "x": 83.5,
        "y": 33.5,
        "role": "object"
      }
    ],
    "intended_path": [
      {
        "from": {
          "x": 66.2,
          "y": 16.2
        },
        "to": {
          "x": 75,
          "y": 25
        }
      },
      {
        "from": {
          "x": 75,
          "y": 25
        },
        "to": {
          "x": 83.5,
          "y": 33.5
        }
      },
      {
        "from": {
          "x": 83.5,
          "y": 33.5
        },
        "to": {
          "x": 100,
          "y": 50
        }
      }
    ],
    "english": {
      "tip_zone": "center",
      "sidespin": 0,
      "backspin": 0,
      "follow": 0,
      "label": "none"
    },
    "landing_zones": [
      {
        "x": 100,
        "y": 50,
        "label": "pocket"
      },
      {
        "x": 72.2,
        "y": 22.2,
        "label": "cb_rest"
      }
    ],
    "pocket_target": {
      "x": 100,
      "y": 50
    },
    "coordinate_system": {
      "x": "0=head rail → 100=foot rail",
      "y": "0=bottom long rail → 50=top long rail",
      "units": "normalized table percent (9-foot aspect 2:1)"
    },
    "source": "catalogue",
    "ascii_table": "O───────────────────────────────────────O\n│                                      O│\n│                                    ·· │\n│                                   ·   │\n│                                 ··    │\n│                                2      │\n│                              ··       │\n│                             1         │\n│                          ··           │\n│                         C             │\n│                                       │\n│                                       │\n│                                       │\n│                                       │\nO───────────────────────────────────────O\nLegend: C=cue  1-9=object  H=helper  X=blocker  O=pocket  ·=path"
  },
  {
    "id": "sotd-09",
    "name": "Carom Off the 9",
    "difficulty": "Medium",
    "difficulty_rating": 2,
    "category": "carom",
    "speed_category": "soft",
    "tip_zone": "12-high",
    "cue_ball_start": {
      "x": 38.6,
      "y": 12
    },
    "object_ball_positions": [
      {
        "ballId": 1,
        "x": 70,
        "y": 18,
        "role": "object"
      },
      {
        "ballId": 9,
        "x": 95.2,
        "y": 3.6,
        "role": "object"
      }
    ],
    "intended_path": [
      {
        "from": {
          "x": 38.6,
          "y": 12
        },
        "to": {
          "x": 68.2,
          "y": 16.6
        },
        "kind": "ground",
        "style": "solid"
      },
      {
        "from": {
          "x": 68.2,
          "y": 16.6
        },
        "to": {
          "x": 93.4,
          "y": 5
        },
        "kind": "cue_after",
        "style": "solid"
      },
      {
        "from": {
          "x": 93.4,
          "y": 5
        },
        "to": {
          "x": 100,
          "y": 0
        },
        "kind": "object",
        "style": "solid"
      }
    ],
    "english": {
      "tip_zone": "12-high",
      "sidespin": 0,
      "backspin": 0,
      "follow": 0.7,
      "label": "follow"
    },
    "landing_zones": [
      {
        "x": 100,
        "y": 0,
        "label": "pocket"
      },
      {
        "x": 95.6,
        "y": 6.6,
        "label": "cb_rest"
      }
    ],
    "pocket_target": {
      "x": 100,
      "y": 0
    },
    "extra_object_paths": [
      {
        "ballId": 1,
        "pts": [
          {
            "x": 70,
            "y": 18
          },
          {
            "x": 77,
            "y": 23.6
          }
        ],
        "faded": true
      }
    ],
    "ghost_ball": {
      "x": 68.2,
      "y": 16.6,
      "show": false
    },
    "coordinate_system": {
      "x": "0=head rail → 100=foot rail",
      "y": "0=bottom long rail → 50=top long rail",
      "units": "normalized table percent (9-foot aspect 2:1)"
    },
    "source": "catalogue",
    "ascii_table": "O───────────────────────────────────────O\n│                                       │\n│                                       │\n│                                       │\n│                                       │\n│                                       │\n│                                       │\n│                                       │\n│                                       │\n│                     · ··  1           │\n│               C· ··         ··        │\n│                               · ··    │\n│                                    9· │\n│                                      O│\nO───────────────────────────────────────O\nLegend: C=cue  1-9=object  H=helper  X=blocker  O=pocket  ·=path"
  },
  {
    "id": "sotd-10",
    "name": "Rail Cut Thin as Hair",
    "difficulty": "Hard",
    "difficulty_rating": 3,
    "category": "position",
    "speed_category": "feather",
    "tip_zone": "center",
    "cue_ball_start": {
      "x": 57.8,
      "y": 25
    },
    "object_ball_positions": [
      {
        "ballId": 1,
        "x": 75,
        "y": 1.2,
        "role": "object"
      }
    ],
    "intended_path": [
      {
        "from": {
          "x": 57.8,
          "y": 25
        },
        "to": {
          "x": 75,
          "y": 1.2
        }
      },
      {
        "from": {
          "x": 75,
          "y": 1.2
        },
        "to": {
          "x": 100,
          "y": 0
        }
      }
    ],
    "english": {
      "tip_zone": "center",
      "sidespin": 0,
      "backspin": 0,
      "follow": 0,
      "label": "none"
    },
    "landing_zones": [
      {
        "x": 100,
        "y": 0,
        "label": "pocket"
      },
      {
        "x": 72.5,
        "y": 7.3,
        "label": "cb_rest"
      }
    ],
    "pocket_target": {
      "x": 100,
      "y": 0
    },
    "coordinate_system": {
      "x": "0=head rail → 100=foot rail",
      "y": "0=bottom long rail → 50=top long rail",
      "units": "normalized table percent (9-foot aspect 2:1)"
    },
    "source": "catalogue",
    "ascii_table": "O───────────────────────────────────────O\n│                                       │\n│                                       │\n│                                       │\n│                                       │\n│                                       │\n│                                       │\n│                      C                │\n│                       ·               │\n│                        ··             │\n│                          ·            │\n│                           ·           │\n│                            ·          │\n│                             1· ·· ·· O│\nO───────────────────────────────────────O\nLegend: C=cue  1-9=object  H=helper  X=blocker  O=pocket  ·=path"
  },
  {
    "id": "sotd-11",
    "name": "Force Follow Over Distance",
    "difficulty": "Medium",
    "difficulty_rating": 2,
    "category": "position",
    "speed_category": "firm",
    "tip_zone": "12-high",
    "cue_ball_start": {
      "x": 25.1,
      "y": 6.1
    },
    "object_ball_positions": [
      {
        "ballId": 1,
        "x": 74,
        "y": 30,
        "role": "object"
      }
    ],
    "intended_path": [
      {
        "from": {
          "x": 25.1,
          "y": 6.1
        },
        "to": {
          "x": 74,
          "y": 30
        }
      },
      {
        "from": {
          "x": 74,
          "y": 30
        },
        "to": {
          "x": 100,
          "y": 50
        }
      }
    ],
    "english": {
      "tip_zone": "12-high",
      "sidespin": 0,
      "backspin": 0,
      "follow": 0.7,
      "label": "follow"
    },
    "landing_zones": [
      {
        "x": 100,
        "y": 50,
        "label": "pocket"
      },
      {
        "x": 97.7,
        "y": 29,
        "label": "cb_rest"
      }
    ],
    "pocket_target": {
      "x": 100,
      "y": 50
    },
    "coordinate_system": {
      "x": "0=head rail → 100=foot rail",
      "y": "0=bottom long rail → 50=top long rail",
      "units": "normalized table percent (9-foot aspect 2:1)"
    },
    "source": "catalogue",
    "ascii_table": "O───────────────────────────────────────O\n│                                      O│\n│                                    ·· │\n│                                 ··    │\n│                                ·      │\n│                             · ·       │\n│                           ·1          │\n│                       ···             │\n│                    ··                 │\n│                · ··                   │\n│              ··                       │\n│           ··                          │\n│          C                            │\n│                                       │\nO───────────────────────────────────────O\nLegend: C=cue  1-9=object  H=helper  X=blocker  O=pocket  ·=path"
  },
  {
    "id": "sotd-12",
    "name": "Power Draw Escape",
    "difficulty": "Hard",
    "difficulty_rating": 3,
    "category": "position",
    "speed_category": "firm",
    "tip_zone": "6-low",
    "cue_ball_start": {
      "x": 57.6,
      "y": 31.8
    },
    "object_ball_positions": [
      {
        "ballId": 1,
        "x": 80,
        "y": 15,
        "role": "object"
      }
    ],
    "intended_path": [
      {
        "from": {
          "x": 57.6,
          "y": 31.8
        },
        "to": {
          "x": 80,
          "y": 15
        }
      },
      {
        "from": {
          "x": 80,
          "y": 15
        },
        "to": {
          "x": 100,
          "y": 0
        }
      }
    ],
    "english": {
      "tip_zone": "6-low",
      "sidespin": 0,
      "backspin": 0.75,
      "follow": 0,
      "label": "draw"
    },
    "landing_zones": [
      {
        "x": 100,
        "y": 0,
        "label": "pocket"
      },
      {
        "x": 47.8,
        "y": 39.2,
        "label": "cb_rest"
      }
    ],
    "pocket_target": {
      "x": 100,
      "y": 0
    },
    "coordinate_system": {
      "x": "0=head rail → 100=foot rail",
      "y": "0=bottom long rail → 50=top long rail",
      "units": "normalized table percent (9-foot aspect 2:1)"
    },
    "source": "catalogue",
    "ascii_table": "O───────────────────────────────────────O\n│                                       │\n│                                       │\n│                                       │\n│                                       │\n│                      C                │\n│                       ·               │\n│                        · ·            │\n│                           ··          │\n│                             ·1        │\n│                                ·      │\n│                                 ··    │\n│                                   · · │\n│                                      O│\nO───────────────────────────────────────O\nLegend: C=cue  1-9=object  H=helper  X=blocker  O=pocket  ·=path"
  },
  {
    "id": "sotd-13",
    "name": "Bank the 9 Off Two Rails",
    "difficulty": "Insane",
    "difficulty_rating": 4,
    "category": "bank",
    "speed_category": "firm",
    "tip_zone": "center",
    "cue_ball_start": {
      "x": 32.3,
      "y": 23.4
    },
    "object_ball_positions": [
      {
        "ballId": 9,
        "x": 47,
        "y": 17,
        "role": "object"
      }
    ],
    "intended_path": [
      {
        "from": {
          "x": 32.3,
          "y": 23.4
        },
        "to": {
          "x": 47,
          "y": 17
        }
      },
      {
        "from": {
          "x": 47,
          "y": 17
        },
        "to": {
          "x": 85.8,
          "y": 0
        }
      },
      {
        "from": {
          "x": 85.8,
          "y": 0
        },
        "to": {
          "x": 100,
          "y": 6.2
        }
      },
      {
        "from": {
          "x": 100,
          "y": 6.2
        },
        "to": {
          "x": 0,
          "y": 50
        }
      }
    ],
    "english": {
      "tip_zone": "center",
      "sidespin": 0,
      "backspin": 0,
      "follow": 0,
      "label": "none"
    },
    "landing_zones": [
      {
        "x": 0,
        "y": 50,
        "label": "pocket"
      },
      {
        "x": 43.4,
        "y": 18.6,
        "label": "cb_rest"
      }
    ],
    "pocket_target": {
      "x": 0,
      "y": 50
    },
    "ghost_ball": {
      "x": 43,
      "y": 18.8,
      "show": false
    },
    "coordinate_system": {
      "x": "0=head rail → 100=foot rail",
      "y": "0=bottom long rail → 50=top long rail",
      "units": "normalized table percent (9-foot aspect 2:1)"
    },
    "source": "catalogue",
    "ascii_table": "O───────────────────────────────────────O\n│O·                                     │\n│   ··                                  │\n│      ···                              │\n│          ··                           │\n│             ···                       │\n│                 ·· ·                  │\n│            C        · ·               │\n│              ··        ·· ·           │\n│                · 9·        · ·        │\n│                     ···       ·· ·    │\n│                         ··        · · │\n│                           · ··    · · │\n│                               ·  ·    │\nO───────────────────────────────────────O\nLegend: C=cue  1-9=object  H=helper  X=blocker  O=pocket  ·=path"
  },
  {
    "id": "sotd-14",
    "name": "Curve Around a Blocker",
    "difficulty": "Hard",
    "difficulty_rating": 3,
    "category": "curve",
    "speed_category": "soft",
    "tip_zone": "1:30-high-right",
    "cue_ball_start": {
      "x": 50,
      "y": 5
    },
    "object_ball_positions": [
      {
        "ballId": 1,
        "x": 72.3,
        "y": 39.9,
        "role": "object"
      },
      {
        "ballId": 8,
        "x": 60.1,
        "y": 21.1,
        "role": "blocker"
      }
    ],
    "intended_path": [
      {
        "from": {
          "x": 50,
          "y": 5
        },
        "to": {
          "x": 49.1,
          "y": 9.1
        }
      },
      {
        "from": {
          "x": 49.1,
          "y": 9.1
        },
        "to": {
          "x": 48.6,
          "y": 13
        }
      },
      {
        "from": {
          "x": 48.6,
          "y": 13
        },
        "to": {
          "x": 48.6,
          "y": 16.6
        }
      },
      {
        "from": {
          "x": 48.6,
          "y": 16.6
        },
        "to": {
          "x": 49,
          "y": 19.9
        }
      },
      {
        "from": {
          "x": 49,
          "y": 19.9
        },
        "to": {
          "x": 49.9,
          "y": 23.1
        }
      },
      {
        "from": {
          "x": 49.9,
          "y": 23.1
        },
        "to": {
          "x": 51.2,
          "y": 26
        }
      },
      {
        "from": {
          "x": 51.2,
          "y": 26
        },
        "to": {
          "x": 52.9,
          "y": 28.7
        }
      },
      {
        "from": {
          "x": 52.9,
          "y": 28.7
        },
        "to": {
          "x": 55.1,
          "y": 31.1
        }
      },
      {
        "from": {
          "x": 55.1,
          "y": 31.1
        },
        "to": {
          "x": 57.7,
          "y": 33.3
        }
      },
      {
        "from": {
          "x": 57.7,
          "y": 33.3
        },
        "to": {
          "x": 60.7,
          "y": 35.2
        }
      },
      {
        "from": {
          "x": 60.7,
          "y": 35.2
        },
        "to": {
          "x": 64.2,
          "y": 36.9
        }
      },
      {
        "from": {
          "x": 64.2,
          "y": 36.9
        },
        "to": {
          "x": 68.1,
          "y": 38.4
        }
      },
      {
        "from": {
          "x": 68.1,
          "y": 38.4
        },
        "to": {
          "x": 72.3,
          "y": 39.9
        }
      },
      {
        "from": {
          "x": 72.3,
          "y": 39.9
        },
        "to": {
          "x": 100,
          "y": 50
        }
      }
    ],
    "english": {
      "tip_zone": "1:30-high-right",
      "sidespin": 0.45,
      "backspin": 0,
      "follow": 0.5,
      "label": "high-right"
    },
    "landing_zones": [
      {
        "x": 100,
        "y": 50,
        "label": "pocket"
      },
      {
        "x": 75.8,
        "y": 41.2,
        "label": "cb_rest"
      }
    ],
    "pocket_target": {
      "x": 100,
      "y": 50
    },
    "coordinate_system": {
      "x": "0=head rail → 100=foot rail",
      "y": "0=bottom long rail → 50=top long rail",
      "units": "normalized table percent (9-foot aspect 2:1)"
    },
    "source": "catalogue",
    "ascii_table": "O───────────────────────────────────────O\n│                                    · O│\n│                                ·· ·   │\n│                           1 ··        │\n│                        ·· ·           │\n│                     ··                │\n│                    ··                 │\n│                   ·                   │\n│                   ·   X               │\n│                  ··                   │\n│                   ·                   │\n│                   ·                   │\n│                   C                   │\n│                                       │\nO───────────────────────────────────────O\nLegend: C=cue  1-9=object  H=helper  X=blocker  O=pocket  ·=path"
  },
  {
    "id": "sotd-15",
    "name": "Jump Over the Troublemaker",
    "difficulty": "Hard",
    "difficulty_rating": 3,
    "category": "jump",
    "speed_category": "firm",
    "tip_zone": "center",
    "cue_ball_start": {
      "x": 68.7,
      "y": 19.5
    },
    "object_ball_positions": [
      {
        "ballId": 1,
        "x": 84,
        "y": 10,
        "role": "object"
      },
      {
        "ballId": 7,
        "x": 75.9,
        "y": 15,
        "role": "blocker"
      }
    ],
    "intended_path": [
      {
        "from": {
          "x": 68.7,
          "y": 19.5
        },
        "to": {
          "x": 72.6,
          "y": 17.2
        },
        "kind": "ground",
        "style": "solid"
      },
      {
        "from": {
          "x": 72.6,
          "y": 17.2
        },
        "to": {
          "x": 75.9,
          "y": 15
        },
        "kind": "airborne",
        "style": "dashed"
      },
      {
        "from": {
          "x": 75.9,
          "y": 15
        },
        "to": {
          "x": 79.3,
          "y": 12.9
        },
        "kind": "airborne",
        "style": "dashed"
      },
      {
        "from": {
          "x": 79.3,
          "y": 12.9
        },
        "to": {
          "x": 84,
          "y": 10
        },
        "kind": "ground",
        "style": "solid"
      },
      {
        "from": {
          "x": 84,
          "y": 10
        },
        "to": {
          "x": 100,
          "y": 0
        },
        "kind": "object",
        "style": "solid"
      }
    ],
    "english": {
      "tip_zone": "center",
      "sidespin": 0,
      "backspin": 0,
      "follow": 0,
      "label": "none"
    },
    "landing_zones": [
      {
        "x": 100,
        "y": 0,
        "label": "pocket"
      },
      {
        "x": 80.7,
        "y": 12.1,
        "label": "cb_rest"
      }
    ],
    "pocket_target": {
      "x": 100,
      "y": 0
    },
    "coordinate_system": {
      "x": "0=head rail → 100=foot rail",
      "y": "0=bottom long rail → 50=top long rail",
      "units": "normalized table percent (9-foot aspect 2:1)"
    },
    "source": "catalogue",
    "ascii_table": "O───────────────────────────────────────O\n│                                       │\n│                                       │\n│                                       │\n│                                       │\n│                                       │\n│                                       │\n│                                       │\n│                          C            │\n│                           ··X         │\n│                              ··       │\n│                                1·     │\n│                                  · ·  │\n│                                     ·O│\nO───────────────────────────────────────O\nLegend: C=cue  1-9=object  H=helper  X=blocker  O=pocket  ·=path"
  },
  {
    "id": "sotd-16",
    "name": "Massé Orbit (Training Version)",
    "difficulty": "Insane",
    "difficulty_rating": 4,
    "category": "masse",
    "speed_category": "soft",
    "tip_zone": "4:30-low-right",
    "cue_ball_start": {
      "x": 33,
      "y": 4
    },
    "object_ball_positions": [
      {
        "ballId": 1,
        "x": 46.6,
        "y": 3.7,
        "role": "object"
      },
      {
        "ballId": 5,
        "x": 38.6,
        "y": 4.3,
        "role": "blocker"
      }
    ],
    "intended_path": [
      {
        "from": {
          "x": 33,
          "y": 4
        },
        "to": {
          "x": 33.1,
          "y": 6.9
        }
      },
      {
        "from": {
          "x": 33.1,
          "y": 6.9
        },
        "to": {
          "x": 33.4,
          "y": 9.3
        }
      },
      {
        "from": {
          "x": 33.4,
          "y": 9.3
        },
        "to": {
          "x": 33.8,
          "y": 11.2
        }
      },
      {
        "from": {
          "x": 33.8,
          "y": 11.2
        },
        "to": {
          "x": 34.4,
          "y": 12.7
        }
      },
      {
        "from": {
          "x": 34.4,
          "y": 12.7
        },
        "to": {
          "x": 35.1,
          "y": 13.7
        }
      },
      {
        "from": {
          "x": 35.1,
          "y": 13.7
        },
        "to": {
          "x": 35.9,
          "y": 14.1
        }
      },
      {
        "from": {
          "x": 35.9,
          "y": 14.1
        },
        "to": {
          "x": 36.8,
          "y": 14.2
        }
      },
      {
        "from": {
          "x": 36.8,
          "y": 14.2
        },
        "to": {
          "x": 37.9,
          "y": 13.7
        }
      },
      {
        "from": {
          "x": 37.9,
          "y": 13.7
        },
        "to": {
          "x": 39.1,
          "y": 12.7
        }
      },
      {
        "from": {
          "x": 39.1,
          "y": 12.7
        },
        "to": {
          "x": 40.5,
          "y": 11.3
        }
      },
      {
        "from": {
          "x": 40.5,
          "y": 11.3
        },
        "to": {
          "x": 42,
          "y": 9.4
        }
      },
      {
        "from": {
          "x": 42,
          "y": 9.4
        },
        "to": {
          "x": 43.6,
          "y": 7
        }
      },
      {
        "from": {
          "x": 43.6,
          "y": 7
        },
        "to": {
          "x": 46.6,
          "y": 3.7
        }
      },
      {
        "from": {
          "x": 46.6,
          "y": 3.7
        },
        "to": {
          "x": 50,
          "y": 0
        }
      }
    ],
    "english": {
      "tip_zone": "4:30-low-right",
      "sidespin": 0.4,
      "backspin": 0.55,
      "follow": 0,
      "label": "low-right"
    },
    "landing_zones": [
      {
        "x": 50,
        "y": 0,
        "label": "pocket"
      },
      {
        "x": 41.1,
        "y": 8.4,
        "label": "cb_rest"
      }
    ],
    "pocket_target": {
      "x": 50,
      "y": 0
    },
    "coordinate_system": {
      "x": "0=head rail → 100=foot rail",
      "y": "0=bottom long rail → 50=top long rail",
      "units": "normalized table percent (9-foot aspect 2:1)"
    },
    "source": "catalogue",
    "ascii_table": "O───────────────────────────────────────O\n│                                       │\n│                                       │\n│                                       │\n│                                       │\n│                                       │\n│                                       │\n│                                       │\n│                                       │\n│                                       │\n│             ···                       │\n│             ·  ·                      │\n│             C X ·1                    │\n│                  ·O                   │\nO───────────────────────────────────────O\nLegend: C=cue  1-9=object  H=helper  X=blocker  O=pocket  ·=path"
  },
  {
    "id": "sotd-17",
    "name": "Rail-First Kick Safety",
    "difficulty": "Medium",
    "difficulty_rating": 2,
    "category": "kick",
    "speed_category": "soft",
    "tip_zone": "center",
    "cue_ball_start": {
      "x": 18,
      "y": 26
    },
    "object_ball_positions": [
      {
        "ballId": 8,
        "x": 70,
        "y": 29,
        "role": "object"
      },
      {
        "ballId": 3,
        "x": 44,
        "y": 27.5,
        "role": "blocker"
      }
    ],
    "intended_path": [
      {
        "from": {
          "x": 18,
          "y": 26
        },
        "to": {
          "x": 43.9,
          "y": 0
        }
      },
      {
        "from": {
          "x": 43.9,
          "y": 0
        },
        "to": {
          "x": 70,
          "y": 29
        }
      },
      {
        "from": {
          "x": 70,
          "y": 29
        },
        "to": {
          "x": 68.6,
          "y": 32.8
        }
      }
    ],
    "english": {
      "tip_zone": "center",
      "sidespin": 0,
      "backspin": 0,
      "follow": 0,
      "label": "none"
    },
    "landing_zones": [
      {
        "x": 68.6,
        "y": 32.8,
        "label": "target"
      },
      {
        "x": 77.3,
        "y": 29.3,
        "label": "cb_rest"
      }
    ],
    "pocket_target": {
      "x": 68.6,
      "y": 32.8
    },
    "shot_goal": "spot",
    "coordinate_system": {
      "x": "0=head rail → 100=foot rail",
      "y": "0=bottom long rail → 50=top long rail",
      "units": "normalized table percent (9-foot aspect 2:1)"
    },
    "source": "catalogue",
    "ascii_table": "O───────────────────────────────────────O\n│                                       │\n│                                       │\n│                                       │\n│                                       │\n│                          O            │\n│                 X        ·8           │\n│       C·                ··            │\n│         ·              ·              │\n│          ·            ·               │\n│           ··        ··                │\n│             ·      ·                  │\n│               ·· ··                   │\n│                                       │\nO───────────────────────────────────────O\nLegend: C=cue  1-9=object  H=helper  X=blocker  O=pocket  ·=path"
  },
  {
    "id": "sotd-18",
    "name": "Frozen Combo Rail Run",
    "difficulty": "Hard",
    "difficulty_rating": 3,
    "category": "combo",
    "speed_category": "soft",
    "tip_zone": "center",
    "cue_ball_start": {
      "x": 70.6,
      "y": 42.8
    },
    "object_ball_positions": [
      {
        "ballId": 1,
        "x": 85.7,
        "y": 48.5,
        "role": "object"
      },
      {
        "ballId": 2,
        "x": 88,
        "y": 48.8,
        "role": "object"
      }
    ],
    "intended_path": [
      {
        "from": {
          "x": 70.6,
          "y": 42.8
        },
        "to": {
          "x": 85.7,
          "y": 48.5
        }
      },
      {
        "from": {
          "x": 85.7,
          "y": 48.5
        },
        "to": {
          "x": 88,
          "y": 48.8
        }
      },
      {
        "from": {
          "x": 88,
          "y": 48.8
        },
        "to": {
          "x": 100,
          "y": 50
        }
      }
    ],
    "english": {
      "tip_zone": "center",
      "sidespin": 0,
      "backspin": 0,
      "follow": 0,
      "label": "none"
    },
    "landing_zones": [
      {
        "x": 100,
        "y": 50,
        "label": "pocket"
      },
      {
        "x": 82.6,
        "y": 41.3,
        "label": "cb_rest"
      }
    ],
    "pocket_target": {
      "x": 100,
      "y": 50
    },
    "coordinate_system": {
      "x": "0=head rail → 100=foot rail",
      "y": "0=bottom long rail → 50=top long rail",
      "units": "normalized table percent (9-foot aspect 2:1)"
    },
    "source": "catalogue",
    "ascii_table": "O───────────────────────────────────────O\n│                                 2 ·· O│\n│                            · ··       │\n│                           C           │\n│                                       │\n│                                       │\n│                                       │\n│                                       │\n│                                       │\n│                                       │\n│                                       │\n│                                       │\n│                                       │\n│                                       │\nO───────────────────────────────────────O\nLegend: C=cue  1-9=object  H=helper  X=blocker  O=pocket  ·=path"
  },
  {
    "id": "sotd-19",
    "name": "Wing Shot Bank",
    "difficulty": "Hard",
    "difficulty_rating": 3,
    "category": "bank",
    "speed_category": "medium",
    "tip_zone": "center",
    "cue_ball_start": {
      "x": 76.3,
      "y": 33.5
    },
    "object_ball_positions": [
      {
        "ballId": 1,
        "x": 70,
        "y": 12.5,
        "role": "object"
      }
    ],
    "intended_path": [
      {
        "from": {
          "x": 76.3,
          "y": 33.5
        },
        "to": {
          "x": 70,
          "y": 12.5
        }
      },
      {
        "from": {
          "x": 70,
          "y": 12.5
        },
        "to": {
          "x": 56,
          "y": 0
        }
      },
      {
        "from": {
          "x": 56,
          "y": 0
        },
        "to": {
          "x": 0,
          "y": 50
        }
      }
    ],
    "english": {
      "tip_zone": "center",
      "sidespin": 0,
      "backspin": 0,
      "follow": 0,
      "label": "none"
    },
    "landing_zones": [
      {
        "x": 0,
        "y": 50,
        "label": "pocket"
      },
      {
        "x": 76.3,
        "y": 8.8,
        "label": "cb_rest"
      }
    ],
    "pocket_target": {
      "x": 0,
      "y": 50
    },
    "ghost_ball": {
      "x": 73.3,
      "y": 15.4,
      "show": true
    },
    "coordinate_system": {
      "x": "0=head rail → 100=foot rail",
      "y": "0=bottom long rail → 50=top long rail",
      "units": "normalized table percent (9-foot aspect 2:1)"
    },
    "source": "catalogue",
    "ascii_table": "O───────────────────────────────────────O\n│O                                      │\n│ ··                                    │\n│   ·                                   │\n│    · ·                                │\n│       ··                    C         │\n│         ·                   ·         │\n│          ··                ·          │\n│            ·               ·          │\n│             · ·           ·           │\n│                ··         1           │\n│                  ·     · ·            │\n│                   ·· ··               │\n│                                       │\nO───────────────────────────────────────O\nLegend: C=cue  1-9=object  H=helper  X=blocker  O=pocket  ·=path"
  },
  {
    "id": "sotd-20",
    "name": "Length of the Table Stop",
    "difficulty": "Hard",
    "difficulty_rating": 3,
    "category": "position",
    "speed_category": "medium",
    "tip_zone": "center",
    "cue_ball_start": {
      "x": 27,
      "y": 13.5
    },
    "object_ball_positions": [
      {
        "ballId": 1,
        "x": 75,
        "y": 37.5,
        "role": "object"
      }
    ],
    "intended_path": [
      {
        "from": {
          "x": 27,
          "y": 13.5
        },
        "to": {
          "x": 75,
          "y": 37.5
        }
      },
      {
        "from": {
          "x": 75,
          "y": 37.5
        },
        "to": {
          "x": 100,
          "y": 50
        }
      }
    ],
    "english": {
      "tip_zone": "center",
      "sidespin": 0,
      "backspin": 0,
      "follow": 0,
      "label": "none"
    },
    "landing_zones": [
      {
        "x": 100,
        "y": 50,
        "label": "pocket"
      },
      {
        "x": 71.5,
        "y": 35.7,
        "label": "cb_rest"
      }
    ],
    "pocket_target": {
      "x": 100,
      "y": 50
    },
    "coordinate_system": {
      "x": "0=head rail → 100=foot rail",
      "y": "0=bottom long rail → 50=top long rail",
      "units": "normalized table percent (9-foot aspect 2:1)"
    },
    "source": "catalogue",
    "ascii_table": "O───────────────────────────────────────O\n│                                     ·O│\n│                                  ··   │\n│                               · ·     │\n│                           · 1·        │\n│                        · ·            │\n│                     · ·               │\n│                   ··                  │\n│              · ··                     │\n│            ··                         │\n│          C                            │\n│                                       │\n│                                       │\n│                                       │\nO───────────────────────────────────────O\nLegend: C=cue  1-9=object  H=helper  X=blocker  O=pocket  ·=path"
  },
  {
    "id": "sotd-21",
    "name": "Reverse English Bank",
    "difficulty": "Insane",
    "difficulty_rating": 4,
    "category": "bank",
    "speed_category": "soft",
    "tip_zone": "9-left",
    "cue_ball_start": {
      "x": 42.7,
      "y": 27.8
    },
    "object_ball_positions": [
      {
        "ballId": 1,
        "x": 34,
        "y": 40,
        "role": "object"
      }
    ],
    "intended_path": [
      {
        "from": {
          "x": 42.7,
          "y": 27.8
        },
        "to": {
          "x": 34,
          "y": 40
        }
      },
      {
        "from": {
          "x": 34,
          "y": 40
        },
        "to": {
          "x": 26.9,
          "y": 50
        }
      },
      {
        "from": {
          "x": 26.9,
          "y": 50
        },
        "to": {
          "x": 0,
          "y": 0
        }
      }
    ],
    "english": {
      "tip_zone": "9-left",
      "sidespin": -0.65,
      "backspin": 0,
      "follow": 0,
      "label": "left"
    },
    "landing_zones": [
      {
        "x": 0,
        "y": 0,
        "label": "pocket"
      },
      {
        "x": 36.3,
        "y": 36.8,
        "label": "cb_rest"
      }
    ],
    "pocket_target": {
      "x": 0,
      "y": 0
    },
    "ghost_ball": {
      "x": 36.5,
      "y": 36.4,
      "show": false
    },
    "coordinate_system": {
      "x": "0=head rail → 100=foot rail",
      "y": "0=bottom long rail → 50=top long rail",
      "units": "normalized table percent (9-foot aspect 2:1)"
    },
    "source": "catalogue",
    "ascii_table": "O───────────────────────────────────────O\n│                                       │\n│         · ·                           │\n│         ·  ·1                         │\n│       ··     ·                        │\n│       ·       ·                       │\n│      ·        ·C                      │\n│     ·                                 │\n│    ·                                  │\n│    ·                                  │\n│  ··                                   │\n│ ·                                     │\n│ ·                                     │\n│O                                      │\nO───────────────────────────────────────O\nLegend: C=cue  1-9=object  H=helper  X=blocker  O=pocket  ·=path"
  },
  {
    "id": "sotd-22",
    "name": "Ticket Pocket Thin Kick",
    "difficulty": "Hard",
    "difficulty_rating": 3,
    "category": "kick",
    "speed_category": "soft",
    "tip_zone": "center",
    "cue_ball_start": {
      "x": 20,
      "y": 14
    },
    "object_ball_positions": [
      {
        "ballId": 1,
        "x": 52.8,
        "y": 2.6,
        "role": "object"
      }
    ],
    "intended_path": [
      {
        "from": {
          "x": 20,
          "y": 14
        },
        "to": {
          "x": 35.1,
          "y": 50
        }
      },
      {
        "from": {
          "x": 35.1,
          "y": 50
        },
        "to": {
          "x": 52.8,
          "y": 2.6
        }
      },
      {
        "from": {
          "x": 52.8,
          "y": 2.6
        },
        "to": {
          "x": 50,
          "y": 0
        }
      }
    ],
    "english": {
      "tip_zone": "center",
      "sidespin": 0,
      "backspin": 0,
      "follow": 0,
      "label": "none"
    },
    "landing_zones": [
      {
        "x": 50,
        "y": 0,
        "label": "pocket"
      },
      {
        "x": 56.8,
        "y": 1.6,
        "label": "cb_rest"
      }
    ],
    "pocket_target": {
      "x": 50,
      "y": 0
    },
    "coordinate_system": {
      "x": "0=head rail → 100=foot rail",
      "y": "0=bottom long rail → 50=top long rail",
      "units": "normalized table percent (9-foot aspect 2:1)"
    },
    "source": "catalogue",
    "ascii_table": "O───────────────────────────────────────O\n│                                       │\n│             ··                        │\n│            · ·                        │\n│           ··  ·                       │\n│          ·    ··                      │\n│          ·     ·                      │\n│         ·       ·                     │\n│         ·       ·                     │\n│        ·         ·                    │\n│        C          ·                   │\n│                   ·                   │\n│                    1                  │\n│                   O·                  │\nO───────────────────────────────────────O\nLegend: C=cue  1-9=object  H=helper  X=blocker  O=pocket  ·=path"
  },
  {
    "id": "sotd-23",
    "name": "Stack Split with Soft Stun",
    "difficulty": "Medium",
    "difficulty_rating": 2,
    "category": "position",
    "speed_category": "soft",
    "tip_zone": "center",
    "cue_ball_start": {
      "x": 40,
      "y": 25
    },
    "object_ball_positions": [
      {
        "ballId": 1,
        "x": 56,
        "y": 25,
        "role": "object"
      },
      {
        "ballId": 2,
        "x": 58,
        "y": 26.2,
        "role": "object"
      },
      {
        "ballId": 3,
        "x": 58,
        "y": 23.9,
        "role": "object"
      }
    ],
    "intended_path": [
      {
        "from": {
          "x": 40,
          "y": 25
        },
        "to": {
          "x": 56,
          "y": 25
        }
      },
      {
        "from": {
          "x": 56,
          "y": 25
        },
        "to": {
          "x": 57,
          "y": 25
        }
      }
    ],
    "english": {
      "tip_zone": "center",
      "sidespin": 0,
      "backspin": 0,
      "follow": 0,
      "label": "none"
    },
    "landing_zones": [
      {
        "x": 57,
        "y": 25,
        "label": "target"
      },
      {
        "x": 52.1,
        "y": 25,
        "label": "cb_rest"
      }
    ],
    "pocket_target": {
      "x": 57,
      "y": 25
    },
    "shot_goal": "spot",
    "extra_object_paths": [
      {
        "ballId": 2,
        "pts": [
          {
            "x": 58,
            "y": 26.2
          },
          {
            "x": 65.8,
            "y": 30.7
          }
        ]
      },
      {
        "ballId": 3,
        "pts": [
          {
            "x": 58,
            "y": 23.9
          },
          {
            "x": 65.8,
            "y": 19.4
          }
        ]
      }
    ],
    "coordinate_system": {
      "x": "0=head rail → 100=foot rail",
      "y": "0=bottom long rail → 50=top long rail",
      "units": "normalized table percent (9-foot aspect 2:1)"
    },
    "source": "catalogue",
    "ascii_table": "O───────────────────────────────────────O\n│                                       │\n│                                       │\n│                                       │\n│                                       │\n│                                       │\n│                                       │\n│               C ·· ·13                │\n│                                       │\n│                                       │\n│                                       │\n│                                       │\n│                                       │\n│                                       │\nO───────────────────────────────────────O\nLegend: C=cue  1-9=object  H=helper  X=blocker  O=pocket  ·=path"
  },
  {
    "id": "sotd-24",
    "name": "Behind-the-Back Novelty (Rail Assist)",
    "difficulty": "Medium",
    "difficulty_rating": 2,
    "category": "novelty",
    "speed_category": "soft",
    "tip_zone": "center",
    "cue_ball_start": {
      "x": 86,
      "y": 3.4
    },
    "object_ball_positions": [
      {
        "ballId": 1,
        "x": 94.2,
        "y": 1.4,
        "role": "object"
      }
    ],
    "intended_path": [
      {
        "from": {
          "x": 86,
          "y": 3.4
        },
        "to": {
          "x": 94.2,
          "y": 1.4
        }
      },
      {
        "from": {
          "x": 94.2,
          "y": 1.4
        },
        "to": {
          "x": 100,
          "y": 0
        }
      }
    ],
    "english": {
      "tip_zone": "center",
      "sidespin": 0,
      "backspin": 0,
      "follow": 0,
      "label": "none"
    },
    "landing_zones": [
      {
        "x": 100,
        "y": 0,
        "label": "pocket"
      },
      {
        "x": 90.4,
        "y": 2.3,
        "label": "cb_rest"
      }
    ],
    "pocket_target": {
      "x": 100,
      "y": 0
    },
    "coordinate_system": {
      "x": "0=head rail → 100=foot rail",
      "y": "0=bottom long rail → 50=top long rail",
      "units": "normalized table percent (9-foot aspect 2:1)"
    },
    "source": "catalogue",
    "ascii_table": "O───────────────────────────────────────O\n│                                       │\n│                                       │\n│                                       │\n│                                       │\n│                                       │\n│                                       │\n│                                       │\n│                                       │\n│                                       │\n│                                       │\n│                                       │\n│                                 C·    │\n│                                    1·O│\nO───────────────────────────────────────O\nLegend: C=cue  1-9=object  H=helper  X=blocker  O=pocket  ·=path"
  },
  {
    "id": "sotd-25",
    "name": "Double Kiss Escape",
    "difficulty": "Hard",
    "difficulty_rating": 3,
    "category": "carom",
    "speed_category": "soft",
    "tip_zone": "1:30-high-right",
    "cue_ball_start": {
      "x": 77.5,
      "y": 2
    },
    "object_ball_positions": [
      {
        "ballId": 1,
        "x": 80,
        "y": 1.2,
        "role": "object"
      }
    ],
    "intended_path": [
      {
        "from": {
          "x": 77.5,
          "y": 2
        },
        "to": {
          "x": 80,
          "y": 1.2
        }
      },
      {
        "from": {
          "x": 80,
          "y": 1.2
        },
        "to": {
          "x": 100,
          "y": 0
        }
      }
    ],
    "english": {
      "tip_zone": "1:30-high-right",
      "sidespin": 0.45,
      "backspin": 0,
      "follow": 0.5,
      "label": "high-right"
    },
    "landing_zones": [
      {
        "x": 100,
        "y": 0,
        "label": "pocket"
      },
      {
        "x": 78.3,
        "y": 9.3,
        "label": "cb_rest"
      }
    ],
    "pocket_target": {
      "x": 100,
      "y": 0
    },
    "ghost_ball": {
      "x": 77.8,
      "y": 1.3,
      "show": false
    },
    "coordinate_system": {
      "x": "0=head rail → 100=foot rail",
      "y": "0=bottom long rail → 50=top long rail",
      "units": "normalized table percent (9-foot aspect 2:1)"
    },
    "source": "catalogue",
    "ascii_table": "O───────────────────────────────────────O\n│                                       │\n│                                       │\n│                                       │\n│                                       │\n│                                       │\n│                                       │\n│                                       │\n│                                       │\n│                                       │\n│                                       │\n│                                       │\n│                                       │\n│                             C1 ·· ·· O│\nO───────────────────────────────────────O\nLegend: C=cue  1-9=object  H=helper  X=blocker  O=pocket  ·=path"
  },
  {
    "id": "sotd-26",
    "name": "Side-Pocket Soft Cut",
    "difficulty": "Medium",
    "difficulty_rating": 2,
    "category": "position",
    "speed_category": "soft",
    "tip_zone": "center",
    "cue_ball_start": {
      "x": 43.7,
      "y": 30.5
    },
    "object_ball_positions": [
      {
        "ballId": 1,
        "x": 52,
        "y": 12.5,
        "role": "object"
      }
    ],
    "intended_path": [
      {
        "from": {
          "x": 43.7,
          "y": 30.5
        },
        "to": {
          "x": 52,
          "y": 12.5
        }
      },
      {
        "from": {
          "x": 52,
          "y": 12.5
        },
        "to": {
          "x": 50,
          "y": 0
        }
      }
    ],
    "english": {
      "tip_zone": "center",
      "sidespin": 0,
      "backspin": 0,
      "follow": 0,
      "label": "none"
    },
    "landing_zones": [
      {
        "x": 50,
        "y": 0,
        "label": "pocket"
      },
      {
        "x": 59.3,
        "y": 13.6,
        "label": "cb_rest"
      }
    ],
    "pocket_target": {
      "x": 50,
      "y": 0
    },
    "coordinate_system": {
      "x": "0=head rail → 100=foot rail",
      "y": "0=bottom long rail → 50=top long rail",
      "units": "normalized table percent (9-foot aspect 2:1)"
    },
    "source": "catalogue",
    "ascii_table": "O───────────────────────────────────────O\n│                                       │\n│                                       │\n│                                       │\n│                                       │\n│                                       │\n│                 C                     │\n│                 ··                    │\n│                  ·                    │\n│                   ·                   │\n│                    1                  │\n│                    ·                  │\n│                   ·                   │\n│                   O                   │\nO───────────────────────────────────────O\nLegend: C=cue  1-9=object  H=helper  X=blocker  O=pocket  ·=path"
  },
  {
    "id": "sotd-27",
    "name": "Lengthwise Bank Cross-Corner",
    "difficulty": "Hard",
    "difficulty_rating": 3,
    "category": "bank",
    "speed_category": "firm",
    "tip_zone": "center",
    "cue_ball_start": {
      "x": 41,
      "y": 37.3
    },
    "object_ball_positions": [
      {
        "ballId": 1,
        "x": 50,
        "y": 24,
        "role": "object"
      }
    ],
    "intended_path": [
      {
        "from": {
          "x": 41,
          "y": 37.3
        },
        "to": {
          "x": 50,
          "y": 24
        }
      },
      {
        "from": {
          "x": 50,
          "y": 24
        },
        "to": {
          "x": 66.2,
          "y": 0
        }
      },
      {
        "from": {
          "x": 66.2,
          "y": 0
        },
        "to": {
          "x": 100,
          "y": 50
        }
      }
    ],
    "english": {
      "tip_zone": "center",
      "sidespin": 0,
      "backspin": 0,
      "follow": 0,
      "label": "none"
    },
    "landing_zones": [
      {
        "x": 100,
        "y": 50,
        "label": "pocket"
      },
      {
        "x": 47.8,
        "y": 27.3,
        "label": "cb_rest"
      }
    ],
    "pocket_target": {
      "x": 100,
      "y": 50
    },
    "ghost_ball": {
      "x": 47.5,
      "y": 27.6,
      "show": false
    },
    "coordinate_system": {
      "x": "0=head rail → 100=foot rail",
      "y": "0=bottom long rail → 50=top long rail",
      "units": "normalized table percent (9-foot aspect 2:1)"
    },
    "source": "catalogue",
    "ascii_table": "O───────────────────────────────────────O\n│                                      O│\n│                                     · │\n│                                   ··  │\n│                C                  ·   │\n│                ·                 ·    │\n│                 ··              ·     │\n│                   1           ··      │\n│                    ·         ·        │\n│                     ·       ·         │\n│                      ·      ·         │\n│                       ·   ··          │\n│                        · ·            │\n│                                       │\nO───────────────────────────────────────O\nLegend: C=cue  1-9=object  H=helper  X=blocker  O=pocket  ·=path"
  },
  {
    "id": "sotd-28",
    "name": "Soft Safety: Hide Behind the 8",
    "difficulty": "Medium",
    "difficulty_rating": 2,
    "category": "position",
    "speed_category": "feather",
    "tip_zone": "center",
    "cue_ball_start": {
      "x": 78.7,
      "y": 27.9
    },
    "object_ball_positions": [
      {
        "ballId": 3,
        "x": 62,
        "y": 32,
        "role": "object"
      },
      {
        "ballId": 8,
        "x": 50,
        "y": 25,
        "role": "prop"
      }
    ],
    "intended_path": [
      {
        "from": {
          "x": 78.7,
          "y": 27.9
        },
        "to": {
          "x": 62,
          "y": 32
        }
      },
      {
        "from": {
          "x": 62,
          "y": 32
        },
        "to": {
          "x": 60.9,
          "y": 34.8
        }
      }
    ],
    "english": {
      "tip_zone": "center",
      "sidespin": 0,
      "backspin": 0,
      "follow": 0,
      "label": "none"
    },
    "landing_zones": [
      {
        "x": 60.9,
        "y": 34.8,
        "label": "target"
      },
      {
        "x": 52.4,
        "y": 25.9,
        "label": "cb_rest"
      }
    ],
    "pocket_target": {
      "x": 60.9,
      "y": 34.8
    },
    "shot_goal": "spot",
    "coordinate_system": {
      "x": "0=head rail → 100=foot rail",
      "y": "0=bottom long rail → 50=top long rail",
      "units": "normalized table percent (9-foot aspect 2:1)"
    },
    "source": "catalogue",
    "ascii_table": "O───────────────────────────────────────O\n│                                       │\n│                                       │\n│                                       │\n│                                       │\n│                       O3              │\n│                         · ·· C        │\n│                   8                   │\n│                                       │\n│                                       │\n│                                       │\n│                                       │\n│                                       │\n│                                       │\nO───────────────────────────────────────O\nLegend: C=cue  1-9=object  H=helper  X=blocker  O=pocket  ·=path"
  },
  {
    "id": "sotd-29",
    "name": "Elevated Draw Over a Rail Nip",
    "difficulty": "Hard",
    "difficulty_rating": 3,
    "category": "position",
    "speed_category": "soft",
    "tip_zone": "6-low",
    "cue_ball_start": {
      "x": 63.8,
      "y": 2.7
    },
    "object_ball_positions": [
      {
        "ballId": 1,
        "x": 86,
        "y": 2.4,
        "role": "object"
      }
    ],
    "intended_path": [
      {
        "from": {
          "x": 63.8,
          "y": 2.7
        },
        "to": {
          "x": 86,
          "y": 2.4
        }
      },
      {
        "from": {
          "x": 86,
          "y": 2.4
        },
        "to": {
          "x": 100,
          "y": 0
        }
      }
    ],
    "english": {
      "tip_zone": "6-low",
      "sidespin": 0,
      "backspin": 0.75,
      "follow": 0,
      "label": "draw"
    },
    "landing_zones": [
      {
        "x": 100,
        "y": 0,
        "label": "pocket"
      },
      {
        "x": 75.4,
        "y": 5.9,
        "label": "cb_rest"
      }
    ],
    "pocket_target": {
      "x": 100,
      "y": 0
    },
    "coordinate_system": {
      "x": "0=head rail → 100=foot rail",
      "y": "0=bottom long rail → 50=top long rail",
      "units": "normalized table percent (9-foot aspect 2:1)"
    },
    "source": "catalogue",
    "ascii_table": "O───────────────────────────────────────O\n│                                       │\n│                                       │\n│                                       │\n│                                       │\n│                                       │\n│                                       │\n│                                       │\n│                                       │\n│                                       │\n│                                       │\n│                                       │\n│                        C ··· ·· 1     │\n│                                  ·· ·O│\nO───────────────────────────────────────O\nLegend: C=cue  1-9=object  H=helper  X=blocker  O=pocket  ·=path"
  },
  {
    "id": "sotd-30",
    "name": "Clockwise Curve Drag",
    "difficulty": "Medium",
    "difficulty_rating": 2,
    "category": "curve",
    "speed_category": "soft",
    "tip_zone": "1:30-high-right",
    "cue_ball_start": {
      "x": 45,
      "y": 25
    },
    "object_ball_positions": [
      {
        "ballId": 1,
        "x": 91.2,
        "y": 9.1,
        "role": "object"
      },
      {
        "ballId": 8,
        "x": 66.2,
        "y": 17.5,
        "role": "blocker"
      }
    ],
    "intended_path": [
      {
        "from": {
          "x": 45,
          "y": 25
        },
        "to": {
          "x": 49.4,
          "y": 26.6
        }
      },
      {
        "from": {
          "x": 49.4,
          "y": 26.6
        },
        "to": {
          "x": 53.6,
          "y": 27.7
        }
      },
      {
        "from": {
          "x": 53.6,
          "y": 27.7
        },
        "to": {
          "x": 57.7,
          "y": 28.3
        }
      },
      {
        "from": {
          "x": 57.7,
          "y": 28.3
        },
        "to": {
          "x": 61.6,
          "y": 28.4
        }
      },
      {
        "from": {
          "x": 61.6,
          "y": 28.4
        },
        "to": {
          "x": 65.5,
          "y": 28.1
        }
      },
      {
        "from": {
          "x": 65.5,
          "y": 28.1
        },
        "to": {
          "x": 69.1,
          "y": 27.3
        }
      },
      {
        "from": {
          "x": 69.1,
          "y": 27.3
        },
        "to": {
          "x": 72.7,
          "y": 26
        }
      },
      {
        "from": {
          "x": 72.7,
          "y": 26
        },
        "to": {
          "x": 76,
          "y": 24.2
        }
      },
      {
        "from": {
          "x": 76,
          "y": 24.2
        },
        "to": {
          "x": 79.3,
          "y": 21.9
        }
      },
      {
        "from": {
          "x": 79.3,
          "y": 21.9
        },
        "to": {
          "x": 82.4,
          "y": 19.2
        }
      },
      {
        "from": {
          "x": 82.4,
          "y": 19.2
        },
        "to": {
          "x": 85.3,
          "y": 16
        }
      },
      {
        "from": {
          "x": 85.3,
          "y": 16
        },
        "to": {
          "x": 88.2,
          "y": 12.3
        }
      },
      {
        "from": {
          "x": 88.2,
          "y": 12.3
        },
        "to": {
          "x": 91.2,
          "y": 9.1
        }
      },
      {
        "from": {
          "x": 91.2,
          "y": 9.1
        },
        "to": {
          "x": 100,
          "y": 0
        }
      }
    ],
    "english": {
      "tip_zone": "1:30-high-right",
      "sidespin": 0.45,
      "backspin": 0,
      "follow": 0.5,
      "label": "high-right"
    },
    "landing_zones": [
      {
        "x": 100,
        "y": 0,
        "label": "pocket"
      },
      {
        "x": 90.9,
        "y": 6.4,
        "label": "cb_rest"
      }
    ],
    "pocket_target": {
      "x": 100,
      "y": 0
    },
    "coordinate_system": {
      "x": "0=head rail → 100=foot rail",
      "y": "0=bottom long rail → 50=top long rail",
      "units": "normalized table percent (9-foot aspect 2:1)"
    },
    "source": "catalogue",
    "ascii_table": "O───────────────────────────────────────O\n│                                       │\n│                                       │\n│                                       │\n│                                       │\n│                                       │\n│                    ·· ·· ·            │\n│                 C·        ·· ·        │\n│                               ·       │\n│                         X      ·      │\n│                                 ··    │\n│                                   1   │\n│                                    ·· │\n│                                      O│\nO───────────────────────────────────────O\nLegend: C=cue  1-9=object  H=helper  X=blocker  O=pocket  ·=path"
  },
  {
    "id": "sotd-31",
    "name": "Three-Ball Line Combo",
    "difficulty": "Medium",
    "difficulty_rating": 2,
    "category": "combo",
    "speed_category": "soft",
    "tip_zone": "center",
    "cue_ball_start": {
      "x": 55.6,
      "y": 24.6
    },
    "object_ball_positions": [
      {
        "ballId": 1,
        "x": 66.9,
        "y": 31.1,
        "role": "object"
      },
      {
        "ballId": 2,
        "x": 76.4,
        "y": 36.5,
        "role": "object"
      },
      {
        "ballId": 3,
        "x": 86,
        "y": 42,
        "role": "object"
      }
    ],
    "intended_path": [
      {
        "from": {
          "x": 55.6,
          "y": 24.6
        },
        "to": {
          "x": 66.9,
          "y": 31.1
        }
      },
      {
        "from": {
          "x": 66.9,
          "y": 31.1
        },
        "to": {
          "x": 76.4,
          "y": 36.5
        }
      },
      {
        "from": {
          "x": 76.4,
          "y": 36.5
        },
        "to": {
          "x": 86,
          "y": 42
        }
      },
      {
        "from": {
          "x": 86,
          "y": 42
        },
        "to": {
          "x": 100,
          "y": 50
        }
      }
    ],
    "english": {
      "tip_zone": "center",
      "sidespin": 0,
      "backspin": 0,
      "follow": 0,
      "label": "none"
    },
    "landing_zones": [
      {
        "x": 100,
        "y": 50,
        "label": "pocket"
      },
      {
        "x": 63.5,
        "y": 29.1,
        "label": "cb_rest"
      }
    ],
    "pocket_target": {
      "x": 100,
      "y": 50
    },
    "coordinate_system": {
      "x": "0=head rail → 100=foot rail",
      "y": "0=bottom long rail → 50=top long rail",
      "units": "normalized table percent (9-foot aspect 2:1)"
    },
    "source": "catalogue",
    "ascii_table": "O───────────────────────────────────────O\n│                                     ·O│\n│                                  ··   │\n│                               · 3     │\n│                             2·        │\n│                           ··          │\n│                        ·1             │\n│                     C ·               │\n│                                       │\n│                                       │\n│                                       │\n│                                       │\n│                                       │\n│                                       │\nO───────────────────────────────────────O\nLegend: C=cue  1-9=object  H=helper  X=blocker  O=pocket  ·=path"
  },
  {
    "id": "sotd-32",
    "name": "Jump-Draw Hybrid Tease",
    "difficulty": "Insane",
    "difficulty_rating": 4,
    "category": "jump",
    "speed_category": "firm",
    "tip_zone": "6-low",
    "cue_ball_start": {
      "x": 75.7,
      "y": 20.2
    },
    "object_ball_positions": [
      {
        "ballId": 1,
        "x": 88,
        "y": 10,
        "role": "object"
      }
    ],
    "intended_path": [
      {
        "from": {
          "x": 75.7,
          "y": 20.2
        },
        "to": {
          "x": 78.8,
          "y": 17.7
        },
        "kind": "ground",
        "style": "solid"
      },
      {
        "from": {
          "x": 78.8,
          "y": 17.7
        },
        "to": {
          "x": 82.6,
          "y": 14.5
        },
        "kind": "airborne",
        "style": "dashed"
      },
      {
        "from": {
          "x": 82.6,
          "y": 14.5
        },
        "to": {
          "x": 88,
          "y": 10
        },
        "kind": "ground",
        "style": "solid"
      },
      {
        "from": {
          "x": 88,
          "y": 10
        },
        "to": {
          "x": 100,
          "y": 0
        },
        "kind": "object",
        "style": "solid"
      }
    ],
    "english": {
      "tip_zone": "6-low",
      "sidespin": 0,
      "backspin": 0.75,
      "follow": 0,
      "label": "draw"
    },
    "landing_zones": [
      {
        "x": 100,
        "y": 0,
        "label": "pocket"
      },
      {
        "x": 79.4,
        "y": 17.2,
        "label": "cb_rest"
      }
    ],
    "pocket_target": {
      "x": 100,
      "y": 0
    },
    "coordinate_system": {
      "x": "0=head rail → 100=foot rail",
      "y": "0=bottom long rail → 50=top long rail",
      "units": "normalized table percent (9-foot aspect 2:1)"
    },
    "source": "catalogue",
    "ascii_table": "O───────────────────────────────────────O\n│                                       │\n│                                       │\n│                                       │\n│                                       │\n│                                       │\n│                                       │\n│                                       │\n│                             C         │\n│                               ·       │\n│                                ·      │\n│                                 1 ·   │\n│                                    ·· │\n│                                      O│\nO───────────────────────────────────────O\nLegend: C=cue  1-9=object  H=helper  X=blocker  O=pocket  ·=path"
  },
  {
    "id": "sotd-33",
    "name": "Hold-Up English Along the Rail",
    "difficulty": "Hard",
    "difficulty_rating": 3,
    "category": "position",
    "speed_category": "medium",
    "tip_zone": "7:30-low-left",
    "cue_ball_start": {
      "x": 18,
      "y": 30
    },
    "object_ball_positions": [
      {
        "ballId": 1,
        "x": 45,
        "y": 6,
        "role": "object"
      }
    ],
    "intended_path": [
      {
        "from": {
          "x": 18,
          "y": 30
        },
        "to": {
          "x": 27.9,
          "y": 50
        }
      },
      {
        "from": {
          "x": 27.9,
          "y": 50
        },
        "to": {
          "x": 45,
          "y": 6
        }
      },
      {
        "from": {
          "x": 45,
          "y": 6
        },
        "to": {
          "x": 50,
          "y": 0
        }
      }
    ],
    "english": {
      "tip_zone": "7:30-low-left",
      "sidespin": -0.4,
      "backspin": 0.55,
      "follow": 0,
      "label": "low-left"
    },
    "landing_zones": [
      {
        "x": 50,
        "y": 0,
        "label": "pocket"
      },
      {
        "x": 35.7,
        "y": 12.1,
        "label": "cb_rest"
      }
    ],
    "pocket_target": {
      "x": 50,
      "y": 0
    },
    "coordinate_system": {
      "x": "0=head rail → 100=foot rail",
      "y": "0=bottom long rail → 50=top long rail",
      "units": "normalized table percent (9-foot aspect 2:1)"
    },
    "source": "catalogue",
    "ascii_table": "O───────────────────────────────────────O\n│                                       │\n│          ··                           │\n│         ·  ·                          │\n│        ·   ·                          │\n│       ·     ·                         │\n│       C      ·                        │\n│              ·                        │\n│               ·                       │\n│               ·                       │\n│                ·                      │\n│                 ·                     │\n│                 1·                    │\n│                   O                   │\nO───────────────────────────────────────O\nLegend: C=cue  1-9=object  H=helper  X=blocker  O=pocket  ·=path"
  },
  {
    "id": "sotd-34",
    "name": "Dead Ball Bank (Soft)",
    "difficulty": "Medium",
    "difficulty_rating": 2,
    "category": "bank",
    "speed_category": "soft",
    "tip_zone": "center",
    "cue_ball_start": {
      "x": 73.4,
      "y": 20.1
    },
    "object_ball_positions": [
      {
        "ballId": 1,
        "x": 68,
        "y": 4,
        "role": "object"
      }
    ],
    "intended_path": [
      {
        "from": {
          "x": 73.4,
          "y": 20.1
        },
        "to": {
          "x": 68,
          "y": 4
        }
      },
      {
        "from": {
          "x": 68,
          "y": 4
        },
        "to": {
          "x": 66.7,
          "y": 0
        }
      },
      {
        "from": {
          "x": 66.7,
          "y": 0
        },
        "to": {
          "x": 50,
          "y": 50
        }
      }
    ],
    "english": {
      "tip_zone": "center",
      "sidespin": 0,
      "backspin": 0,
      "follow": 0,
      "label": "none"
    },
    "landing_zones": [
      {
        "x": 50,
        "y": 50,
        "label": "pocket"
      },
      {
        "x": 69.2,
        "y": 7.7,
        "label": "cb_rest"
      }
    ],
    "pocket_target": {
      "x": 50,
      "y": 50
    },
    "ghost_ball": {
      "x": 69.4,
      "y": 8.2,
      "show": false
    },
    "coordinate_system": {
      "x": "0=head rail → 100=foot rail",
      "y": "0=bottom long rail → 50=top long rail",
      "units": "normalized table percent (9-foot aspect 2:1)"
    },
    "source": "catalogue",
    "ascii_table": "O───────────────────────────────────────O\n│                   O                   │\n│                   ·                   │\n│                    ·                  │\n│                    ·                  │\n│                     ·                 │\n│                     ·                 │\n│                      ·                │\n│                       ·    C          │\n│                       ·   ·           │\n│                        ·  ·           │\n│                        · ·            │\n│                         ·1            │\n│                          ·            │\nO───────────────────────────────────────O\nLegend: C=cue  1-9=object  H=helper  X=blocker  O=pocket  ·=path"
  },
  {
    "id": "sotd-35",
    "name": "Point-to-Point Long Pot",
    "difficulty": "Easy",
    "difficulty_rating": 1,
    "category": "position",
    "speed_category": "medium",
    "tip_zone": "center",
    "cue_ball_start": {
      "x": 25,
      "y": 12.5
    },
    "object_ball_positions": [
      {
        "ballId": 1,
        "x": 75,
        "y": 37.5,
        "role": "object"
      }
    ],
    "intended_path": [
      {
        "from": {
          "x": 25,
          "y": 12.5
        },
        "to": {
          "x": 75,
          "y": 37.5
        }
      },
      {
        "from": {
          "x": 75,
          "y": 37.5
        },
        "to": {
          "x": 100,
          "y": 50
        }
      }
    ],
    "english": {
      "tip_zone": "center",
      "sidespin": 0,
      "backspin": 0,
      "follow": 0,
      "label": "none"
    },
    "landing_zones": [
      {
        "x": 100,
        "y": 50,
        "label": "pocket"
      },
      {
        "x": 71.5,
        "y": 35.7,
        "label": "cb_rest"
      }
    ],
    "pocket_target": {
      "x": 100,
      "y": 50
    },
    "coordinate_system": {
      "x": "0=head rail → 100=foot rail",
      "y": "0=bottom long rail → 50=top long rail",
      "units": "normalized table percent (9-foot aspect 2:1)"
    },
    "source": "catalogue",
    "ascii_table": "O───────────────────────────────────────O\n│                                     ·O│\n│                                  ··   │\n│                               · ·     │\n│                           · 1·        │\n│                        · ·            │\n│                      ··               │\n│                  ···                  │\n│               ··                      │\n│            · ·                        │\n│          C·                           │\n│                                       │\n│                                       │\n│                                       │\nO───────────────────────────────────────O\nLegend: C=cue  1-9=object  H=helper  X=blocker  O=pocket  ·=path"
  },
  {
    "id": "sotd-36",
    "name": "Jump-Kick Hybrid Plan",
    "difficulty": "Hard",
    "difficulty_rating": 3,
    "category": "kick",
    "speed_category": "firm",
    "tip_zone": "center",
    "cue_ball_start": {
      "x": 20,
      "y": 24
    },
    "object_ball_positions": [
      {
        "ballId": 1,
        "x": 86,
        "y": 40,
        "role": "object"
      },
      {
        "ballId": 7,
        "x": 53,
        "y": 32,
        "role": "blocker"
      }
    ],
    "intended_path": [
      {
        "from": {
          "x": 20,
          "y": 24
        },
        "to": {
          "x": 44.6,
          "y": 0
        }
      },
      {
        "from": {
          "x": 44.6,
          "y": 0
        },
        "to": {
          "x": 86,
          "y": 40
        }
      },
      {
        "from": {
          "x": 86,
          "y": 40
        },
        "to": {
          "x": 100,
          "y": 50
        }
      }
    ],
    "english": {
      "tip_zone": "center",
      "sidespin": 0,
      "backspin": 0,
      "follow": 0,
      "label": "none"
    },
    "landing_zones": [
      {
        "x": 100,
        "y": 50,
        "label": "pocket"
      },
      {
        "x": 80.1,
        "y": 44.4,
        "label": "cb_rest"
      }
    ],
    "pocket_target": {
      "x": 100,
      "y": 50
    },
    "coordinate_system": {
      "x": "0=head rail → 100=foot rail",
      "y": "0=bottom long rail → 50=top long rail",
      "units": "normalized table percent (9-foot aspect 2:1)"
    },
    "source": "catalogue",
    "ascii_table": "O───────────────────────────────────────O\n│                                      O│\n│                                   · · │\n│                                 1·    │\n│                                ·      │\n│                    X        ··        │\n│                            ·          │\n│        C                  ·           │\n│         ·               ··            │\n│          ··            ·              │\n│            ··       · ·               │\n│              ·     ·                  │\n│               ·· ··                   │\n│                                       │\nO───────────────────────────────────────O\nLegend: C=cue  1-9=object  H=helper  X=blocker  O=pocket  ·=path"
  },
  {
    "id": "sotd-37",
    "name": "Spin-to-Win Rail First",
    "difficulty": "Hard",
    "difficulty_rating": 3,
    "category": "curve",
    "speed_category": "medium",
    "tip_zone": "3-right",
    "cue_ball_start": {
      "x": 22,
      "y": 14
    },
    "object_ball_positions": [
      {
        "ballId": 1,
        "x": 56,
        "y": 16,
        "role": "object"
      }
    ],
    "intended_path": [
      {
        "from": {
          "x": 22,
          "y": 14
        },
        "to": {
          "x": 37.5,
          "y": 50
        }
      },
      {
        "from": {
          "x": 37.5,
          "y": 50
        },
        "to": {
          "x": 56,
          "y": 16
        }
      },
      {
        "from": {
          "x": 56,
          "y": 16
        },
        "to": {
          "x": 50,
          "y": 0
        }
      }
    ],
    "english": {
      "tip_zone": "3-right",
      "sidespin": 0.65,
      "backspin": 0,
      "follow": 0,
      "label": "right"
    },
    "landing_zones": [
      {
        "x": 50,
        "y": 0,
        "label": "pocket"
      },
      {
        "x": 63.3,
        "y": 15.6,
        "label": "cb_rest"
      }
    ],
    "pocket_target": {
      "x": 50,
      "y": 0
    },
    "coordinate_system": {
      "x": "0=head rail → 100=foot rail",
      "y": "0=bottom long rail → 50=top long rail",
      "units": "normalized table percent (9-foot aspect 2:1)"
    },
    "source": "catalogue",
    "ascii_table": "O───────────────────────────────────────O\n│                                       │\n│              ··                       │\n│             ·  ·                      │\n│            ·    ·                     │\n│           ·      ·                    │\n│           ·      ·                    │\n│          ·        ·                   │\n│          ·         ··                 │\n│         ·           1                 │\n│        C            ·                 │\n│                    ·                  │\n│                    ·                  │\n│                   O                   │\nO───────────────────────────────────────O\nLegend: C=cue  1-9=object  H=helper  X=blocker  O=pocket  ·=path"
  },
  {
    "id": "sotd-38",
    "name": "The Spotlight 8 Cut",
    "difficulty": "Medium",
    "difficulty_rating": 2,
    "category": "position",
    "speed_category": "soft",
    "tip_zone": "center",
    "cue_ball_start": {
      "x": 42.3,
      "y": 28.6
    },
    "object_ball_positions": [
      {
        "ballId": 8,
        "x": 62,
        "y": 27,
        "role": "object"
      }
    ],
    "intended_path": [
      {
        "from": {
          "x": 42.3,
          "y": 28.6
        },
        "to": {
          "x": 62,
          "y": 27
        }
      },
      {
        "from": {
          "x": 62,
          "y": 27
        },
        "to": {
          "x": 100,
          "y": 50
        }
      }
    ],
    "english": {
      "tip_zone": "center",
      "sidespin": 0,
      "backspin": 0,
      "follow": 0,
      "label": "none"
    },
    "landing_zones": [
      {
        "x": 100,
        "y": 50,
        "label": "pocket"
      },
      {
        "x": 63.7,
        "y": 19.8,
        "label": "cb_rest"
      }
    ],
    "pocket_target": {
      "x": 100,
      "y": 50
    },
    "coordinate_system": {
      "x": "0=head rail → 100=foot rail",
      "y": "0=bottom long rail → 50=top long rail",
      "units": "normalized table percent (9-foot aspect 2:1)"
    },
    "source": "catalogue",
    "ascii_table": "O───────────────────────────────────────O\n│                                      O│\n│                                   · · │\n│                                 ··    │\n│                              ··       │\n│                           · ·         │\n│                C ·· ··  ··            │\n│                        8              │\n│                                       │\n│                                       │\n│                                       │\n│                                       │\n│                                       │\n│                                       │\nO───────────────────────────────────────O\nLegend: C=cue  1-9=object  H=helper  X=blocker  O=pocket  ·=path"
  },
  {
    "id": "sotd-39",
    "name": "Quad Rail Dream (Path Only)",
    "difficulty": "Insane",
    "difficulty_rating": 4,
    "category": "kick",
    "speed_category": "firm",
    "tip_zone": "12-high",
    "cue_ball_start": {
      "x": 9,
      "y": 46
    },
    "object_ball_positions": [],
    "intended_path": [
      {
        "from": {
          "x": 9,
          "y": 46
        },
        "to": {
          "x": 21.7,
          "y": 50
        }
      },
      {
        "from": {
          "x": 21.7,
          "y": 50
        },
        "to": {
          "x": 100,
          "y": 25.4
        }
      },
      {
        "from": {
          "x": 100,
          "y": 25.4
        },
        "to": {
          "x": 19.1,
          "y": 0
        }
      },
      {
        "from": {
          "x": 19.1,
          "y": 0
        },
        "to": {
          "x": 0,
          "y": 6
        }
      },
      {
        "from": {
          "x": 0,
          "y": 6
        },
        "to": {
          "x": 70,
          "y": 28
        }
      }
    ],
    "english": {
      "tip_zone": "12-high",
      "sidespin": 0,
      "backspin": 0,
      "follow": 0.7,
      "label": "follow"
    },
    "landing_zones": [
      {
        "x": 70,
        "y": 28,
        "label": "end_zone"
      },
      {
        "x": 70,
        "y": 28,
        "label": "cb_rest"
      }
    ],
    "pocket_target": {
      "x": 70,
      "y": 28
    },
    "shot_goal": "path",
    "coordinate_system": {
      "x": "0=head rail → 100=foot rail",
      "y": "0=bottom long rail → 50=top long rail",
      "units": "normalized table percent (9-foot aspect 2:1)"
    },
    "source": "catalogue",
    "ascii_table": "O───────────────────────────────────────O\n│       ·  ·                            │\n│   C ·     · ···                       │\n│                 ·· ·                  │\n│                     ·· ··             │\n│                           ·· ··       │\n│                           O    · ··   │\n│                     ·· ··         · · │\n│                · ··           ·· ·    │\n│            ·· ·          · ··         │\n│      ·· ··         · ·· ·             │\n│ · ··           · ··                   │\n│ · ··     · ·· ·                       │\n│      ·  ·                             │\nO───────────────────────────────────────O\nLegend: C=cue  1-9=object  H=helper  X=blocker  O=pocket  ·=path"
  },
  {
    "id": "sotd-40",
    "name": "Celebration Combo Off Two",
    "difficulty": "Hard",
    "difficulty_rating": 3,
    "category": "combo",
    "speed_category": "medium",
    "tip_zone": "center",
    "cue_ball_start": {
      "x": 48,
      "y": 40.3
    },
    "object_ball_positions": [
      {
        "ballId": 1,
        "x": 55,
        "y": 28.1,
        "role": "object"
      },
      {
        "ballId": 2,
        "x": 62,
        "y": 16,
        "role": "object"
      }
    ],
    "intended_path": [
      {
        "from": {
          "x": 48,
          "y": 40.3
        },
        "to": {
          "x": 55,
          "y": 28.1
        }
      },
      {
        "from": {
          "x": 55,
          "y": 28.1
        },
        "to": {
          "x": 62,
          "y": 16
        }
      },
      {
        "from": {
          "x": 62,
          "y": 16
        },
        "to": {
          "x": 71.2,
          "y": 0
        }
      },
      {
        "from": {
          "x": 71.2,
          "y": 0
        },
        "to": {
          "x": 100,
          "y": 50
        }
      }
    ],
    "english": {
      "tip_zone": "center",
      "sidespin": 0,
      "backspin": 0,
      "follow": 0,
      "label": "none"
    },
    "landing_zones": [
      {
        "x": 100,
        "y": 50,
        "label": "pocket"
      },
      {
        "x": 53,
        "y": 31.5,
        "label": "cb_rest"
      }
    ],
    "pocket_target": {
      "x": 100,
      "y": 50
    },
    "coordinate_system": {
      "x": "0=head rail → 100=foot rail",
      "y": "0=bottom long rail → 50=top long rail",
      "units": "normalized table percent (9-foot aspect 2:1)"
    },
    "source": "catalogue",
    "ascii_table": "O───────────────────────────────────────O\n│                                      O│\n│                                     · │\n│                  C                 ·  │\n│                   ·               ··  │\n│                    ·             ·    │\n│                    ·1           ·     │\n│                      ·          ·     │\n│                      ··        ·      │\n│                        2      ·       │\n│                        ·    ··        │\n│                         ··  ·         │\n│                          · ·          │\n│                                       │\nO───────────────────────────────────────O\nLegend: C=cue  1-9=object  H=helper  X=blocker  O=pocket  ·=path"
  },
  {
    "id": "sotd-41",
    "name": "Butterfly Spread",
    "difficulty": "Hard",
    "difficulty_rating": 3,
    "category": "novelty",
    "speed_category": "firm",
    "tip_zone": "center",
    "cue_ball_start": {
      "x": 20,
      "y": 25
    },
    "object_ball_positions": [
      {
        "ballId": 1,
        "x": 75,
        "y": 25,
        "role": "object"
      },
      {
        "ballId": 2,
        "x": 80.4,
        "y": 26.7,
        "role": "object"
      },
      {
        "ballId": 3,
        "x": 80.4,
        "y": 23.3,
        "role": "object"
      }
    ],
    "intended_path": [
      {
        "from": {
          "x": 20,
          "y": 25
        },
        "to": {
          "x": 75,
          "y": 25
        }
      },
      {
        "from": {
          "x": 75,
          "y": 25
        },
        "to": {
          "x": 79,
          "y": 25
        }
      }
    ],
    "english": {
      "tip_zone": "center",
      "sidespin": 0,
      "backspin": 0,
      "follow": 0,
      "label": "none"
    },
    "landing_zones": [
      {
        "x": 79,
        "y": 25,
        "label": "target"
      },
      {
        "x": 71.1,
        "y": 25,
        "label": "cb_rest"
      }
    ],
    "pocket_target": {
      "x": 79,
      "y": 25
    },
    "shot_goal": "spot",
    "extra_object_paths": [
      {
        "ballId": 2,
        "pts": [
          {
            "x": 80.4,
            "y": 26.7
          },
          {
            "x": 100,
            "y": 50
          }
        ]
      },
      {
        "ballId": 3,
        "pts": [
          {
            "x": 80.4,
            "y": 23.3
          },
          {
            "x": 100,
            "y": 0
          }
        ]
      }
    ],
    "coordinate_system": {
      "x": "0=head rail → 100=foot rail",
      "y": "0=bottom long rail → 50=top long rail",
      "units": "normalized table percent (9-foot aspect 2:1)"
    },
    "source": "catalogue",
    "ascii_table": "O───────────────────────────────────────O\n│                                       │\n│                                       │\n│                                       │\n│                                       │\n│                                       │\n│                                       │\n│        C· ·· ·· ·· ·· ·· ·· 1O3       │\n│                                       │\n│                                       │\n│                                       │\n│                                       │\n│                                       │\n│                                       │\nO───────────────────────────────────────O\nLegend: C=cue  1-9=object  H=helper  X=blocker  O=pocket  ·=path"
  },
  {
    "id": "sotd-42",
    "name": "Machine-Gun Line",
    "difficulty": "Hard",
    "difficulty_rating": 3,
    "category": "combo",
    "speed_category": "medium",
    "tip_zone": "center",
    "cue_ball_start": {
      "x": 70.6,
      "y": 33.3
    },
    "object_ball_positions": [
      {
        "ballId": 1,
        "x": 81.5,
        "y": 39.5,
        "role": "object"
      },
      {
        "ballId": 2,
        "x": 83.6,
        "y": 40.7,
        "role": "object"
      },
      {
        "ballId": 3,
        "x": 85.8,
        "y": 42,
        "role": "object"
      },
      {
        "ballId": 4,
        "x": 88,
        "y": 43.2,
        "role": "object"
      }
    ],
    "intended_path": [
      {
        "from": {
          "x": 70.6,
          "y": 33.3
        },
        "to": {
          "x": 81.5,
          "y": 39.5
        }
      },
      {
        "from": {
          "x": 81.5,
          "y": 39.5
        },
        "to": {
          "x": 83.6,
          "y": 40.7
        }
      },
      {
        "from": {
          "x": 83.6,
          "y": 40.7
        },
        "to": {
          "x": 85.8,
          "y": 42
        }
      },
      {
        "from": {
          "x": 85.8,
          "y": 42
        },
        "to": {
          "x": 88,
          "y": 43.2
        }
      },
      {
        "from": {
          "x": 88,
          "y": 43.2
        },
        "to": {
          "x": 100,
          "y": 50
        }
      }
    ],
    "english": {
      "tip_zone": "center",
      "sidespin": 0,
      "backspin": 0,
      "follow": 0,
      "label": "none"
    },
    "landing_zones": [
      {
        "x": 100,
        "y": 50,
        "label": "pocket"
      },
      {
        "x": 78.1,
        "y": 37.5,
        "label": "cb_rest"
      }
    ],
    "pocket_target": {
      "x": 100,
      "y": 50
    },
    "coordinate_system": {
      "x": "0=head rail → 100=foot rail",
      "y": "0=bottom long rail → 50=top long rail",
      "units": "normalized table percent (9-foot aspect 2:1)"
    },
    "source": "catalogue",
    "ascii_table": "O───────────────────────────────────────O\n│                                      O│\n│                                   ··  │\n│                               ·24     │\n│                              ·1       │\n│                           C·          │\n│                                       │\n│                                       │\n│                                       │\n│                                       │\n│                                       │\n│                                       │\n│                                       │\n│                                       │\nO───────────────────────────────────────O\nLegend: C=cue  1-9=object  H=helper  X=blocker  O=pocket  ·=path"
  },
  {
    "id": "sotd-43",
    "name": "Squeeze Between Friends",
    "difficulty": "Insane",
    "difficulty_rating": 4,
    "category": "novelty",
    "speed_category": "feather",
    "tip_zone": "center",
    "cue_ball_start": {
      "x": 49.2,
      "y": 9.4
    },
    "object_ball_positions": [
      {
        "ballId": 1,
        "x": 90,
        "y": 42,
        "role": "object"
      },
      {
        "ballId": 8,
        "x": 69.4,
        "y": 28.9,
        "role": "blocker"
      },
      {
        "ballId": 7,
        "x": 72.7,
        "y": 24.8,
        "role": "blocker"
      }
    ],
    "intended_path": [
      {
        "from": {
          "x": 49.2,
          "y": 9.4
        },
        "to": {
          "x": 90,
          "y": 42
        }
      },
      {
        "from": {
          "x": 90,
          "y": 42
        },
        "to": {
          "x": 100,
          "y": 50
        }
      }
    ],
    "english": {
      "tip_zone": "center",
      "sidespin": 0,
      "backspin": 0,
      "follow": 0,
      "label": "none"
    },
    "landing_zones": [
      {
        "x": 100,
        "y": 50,
        "label": "pocket"
      },
      {
        "x": 86.9,
        "y": 39.5,
        "label": "cb_rest"
      }
    ],
    "pocket_target": {
      "x": 100,
      "y": 50
    },
    "coordinate_system": {
      "x": "0=head rail → 100=foot rail",
      "y": "0=bottom long rail → 50=top long rail",
      "units": "normalized table percent (9-foot aspect 2:1)"
    },
    "source": "catalogue",
    "ascii_table": "O───────────────────────────────────────O\n│                                      O│\n│                                   · · │\n│                                  1    │\n│                                ··     │\n│                             · ·       │\n│                          X ·          │\n│                          ··X          │\n│                       · ·             │\n│                      ·                │\n│                    ··                 │\n│                   C                   │\n│                                       │\n│                                       │\nO───────────────────────────────────────O\nLegend: C=cue  1-9=object  H=helper  X=blocker  O=pocket  ·=path"
  },
  {
    "id": "sotd-44",
    "name": "Around-the-World CB Tour",
    "difficulty": "Hard",
    "difficulty_rating": 3,
    "category": "kick",
    "speed_category": "firm",
    "tip_zone": "12-high",
    "cue_ball_start": {
      "x": 20,
      "y": 12
    },
    "object_ball_positions": [
      {
        "ballId": 1,
        "x": 2.7,
        "y": 46.3,
        "role": "object"
      }
    ],
    "intended_path": [
      {
        "from": {
          "x": 20,
          "y": 12
        },
        "to": {
          "x": 70.5,
          "y": 50
        }
      },
      {
        "from": {
          "x": 70.5,
          "y": 50
        },
        "to": {
          "x": 100,
          "y": 27.8
        }
      },
      {
        "from": {
          "x": 100,
          "y": 27.8
        },
        "to": {
          "x": 63.1,
          "y": 0
        }
      },
      {
        "from": {
          "x": 63.1,
          "y": 0
        },
        "to": {
          "x": 2.7,
          "y": 46.3
        }
      },
      {
        "from": {
          "x": 2.7,
          "y": 46.3
        },
        "to": {
          "x": 0,
          "y": 50
        }
      }
    ],
    "english": {
      "tip_zone": "12-high",
      "sidespin": 0,
      "backspin": 0,
      "follow": 0.7,
      "label": "follow"
    },
    "landing_zones": [
      {
        "x": 0,
        "y": 50,
        "label": "pocket"
      },
      {
        "x": 2.3,
        "y": 44.7,
        "label": "cb_rest"
      }
    ],
    "pocket_target": {
      "x": 0,
      "y": 50
    },
    "coordinate_system": {
      "x": "0=head rail → 100=foot rail",
      "y": "0=bottom long rail → 50=top long rail",
      "units": "normalized table percent (9-foot aspect 2:1)"
    },
    "source": "catalogue",
    "ascii_table": "O───────────────────────────────────────O\n│O·                                     │\n│ 1·                     · · ··         │\n│   ·                  ··       ··      │\n│     ··             ··           ·     │\n│       ··         ·               · ·  │\n│         ·      ··                   · │\n│           ·· ··                    ·· │\n│           ····                   ·    │\n│          ·     ··              ··     │\n│        C·        ·           ··       │\n│                   ··      · ·         │\n│                      ·· ··            │\n│                                       │\nO───────────────────────────────────────O\nLegend: C=cue  1-9=object  H=helper  X=blocker  O=pocket  ·=path"
  },
  {
    "id": "sotd-45",
    "name": "Elevator Jump Over the Rack Ghost",
    "difficulty": "Insane",
    "difficulty_rating": 4,
    "category": "jump",
    "speed_category": "firm",
    "tip_zone": "center",
    "cue_ball_start": {
      "x": 70.4,
      "y": 16.9
    },
    "object_ball_positions": [
      {
        "ballId": 1,
        "x": 86,
        "y": 8,
        "role": "object"
      }
    ],
    "intended_path": [
      {
        "from": {
          "x": 70.4,
          "y": 16.9
        },
        "to": {
          "x": 74.7,
          "y": 14.4
        },
        "kind": "ground",
        "style": "solid"
      },
      {
        "from": {
          "x": 74.7,
          "y": 14.4
        },
        "to": {
          "x": 80.8,
          "y": 11
        },
        "kind": "airborne",
        "style": "dashed"
      },
      {
        "from": {
          "x": 80.8,
          "y": 11
        },
        "to": {
          "x": 86,
          "y": 8
        },
        "kind": "ground",
        "style": "solid"
      },
      {
        "from": {
          "x": 86,
          "y": 8
        },
        "to": {
          "x": 100,
          "y": 0
        },
        "kind": "object",
        "style": "solid"
      }
    ],
    "english": {
      "tip_zone": "center",
      "sidespin": 0,
      "backspin": 0,
      "follow": 0,
      "label": "none"
    },
    "landing_zones": [
      {
        "x": 100,
        "y": 0,
        "label": "pocket"
      },
      {
        "x": 82.6,
        "y": 10,
        "label": "cb_rest"
      }
    ],
    "pocket_target": {
      "x": 100,
      "y": 0
    },
    "coordinate_system": {
      "x": "0=head rail → 100=foot rail",
      "y": "0=bottom long rail → 50=top long rail",
      "units": "normalized table percent (9-foot aspect 2:1)"
    },
    "source": "catalogue",
    "ascii_table": "O───────────────────────────────────────O\n│                                       │\n│                                       │\n│                                       │\n│                                       │\n│                                       │\n│                                       │\n│                                       │\n│                                       │\n│                           C·          │\n│                              ·        │\n│                                ·1     │\n│                                  ··   │\n│                                     ·O│\nO───────────────────────────────────────O\nLegend: C=cue  1-9=object  H=helper  X=blocker  O=pocket  ·=path"
  },
  {
    "id": "sotd-46",
    "name": "Snake Along the Rail",
    "difficulty": "Hard",
    "difficulty_rating": 3,
    "category": "bank",
    "speed_category": "soft",
    "tip_zone": "center",
    "cue_ball_start": {
      "x": 3.6,
      "y": 13.3
    },
    "object_ball_positions": [
      {
        "ballId": 1,
        "x": 12,
        "y": 3.4,
        "role": "object"
      }
    ],
    "intended_path": [
      {
        "from": {
          "x": 3.6,
          "y": 13.3
        },
        "to": {
          "x": 12,
          "y": 3.4
        }
      },
      {
        "from": {
          "x": 12,
          "y": 3.4
        },
        "to": {
          "x": 14.9,
          "y": 0
        }
      },
      {
        "from": {
          "x": 14.9,
          "y": 0
        },
        "to": {
          "x": 57.4,
          "y": 50
        }
      },
      {
        "from": {
          "x": 57.4,
          "y": 50
        },
        "to": {
          "x": 100,
          "y": 0
        }
      }
    ],
    "english": {
      "tip_zone": "center",
      "sidespin": 0,
      "backspin": 0,
      "follow": 0,
      "label": "none"
    },
    "landing_zones": [
      {
        "x": 100,
        "y": 0,
        "label": "pocket"
      },
      {
        "x": 9.4,
        "y": 6.4,
        "label": "cb_rest"
      }
    ],
    "pocket_target": {
      "x": 100,
      "y": 0
    },
    "ghost_ball": {
      "x": 9.1,
      "y": 6.8,
      "show": false
    },
    "coordinate_system": {
      "x": "0=head rail → 100=foot rail",
      "y": "0=bottom long rail → 50=top long rail",
      "units": "normalized table percent (9-foot aspect 2:1)"
    },
    "source": "catalogue",
    "ascii_table": "O───────────────────────────────────────O\n│                                       │\n│                     · ·               │\n│                   ··   ··             │\n│                  ·       ·            │\n│                 ·         ·           │\n│               ··           ··         │\n│              ·               ·        │\n│             ·                 ·       │\n│           ··                   ··     │\n│ C        ·                       ·    │\n│  ··     ·                         ·   │\n│     1 ··                           ·· │\n│     ·                                O│\nO───────────────────────────────────────O\nLegend: C=cue  1-9=object  H=helper  X=blocker  O=pocket  ·=path"
  },
  {
    "id": "sotd-47",
    "name": "Coin Prop Freeze (Optional Prop)",
    "difficulty": "Hard",
    "difficulty_rating": 3,
    "category": "novelty",
    "speed_category": "feather",
    "tip_zone": "center",
    "cue_ball_start": {
      "x": 59.6,
      "y": 23.1
    },
    "object_ball_positions": [
      {
        "ballId": 1,
        "x": 70,
        "y": 30,
        "role": "object"
      }
    ],
    "intended_path": [
      {
        "from": {
          "x": 59.6,
          "y": 23.1
        },
        "to": {
          "x": 70,
          "y": 30
        }
      },
      {
        "from": {
          "x": 70,
          "y": 30
        },
        "to": {
          "x": 78.3,
          "y": 35.5
        }
      }
    ],
    "english": {
      "tip_zone": "center",
      "sidespin": 0,
      "backspin": 0,
      "follow": 0,
      "label": "none"
    },
    "landing_zones": [
      {
        "x": 78.3,
        "y": 35.5,
        "label": "target"
      },
      {
        "x": 66.7,
        "y": 27.8,
        "label": "cb_rest"
      }
    ],
    "pocket_target": {
      "x": 78.3,
      "y": 35.5
    },
    "shot_goal": "spot",
    "coordinate_system": {
      "x": "0=head rail → 100=foot rail",
      "y": "0=bottom long rail → 50=top long rail",
      "units": "normalized table percent (9-foot aspect 2:1)"
    },
    "source": "catalogue",
    "ascii_table": "O───────────────────────────────────────O\n│                                       │\n│                                       │\n│                                       │\n│                              O        │\n│                            ··         │\n│                         · 1           │\n│                       C·              │\n│                                       │\n│                                       │\n│                                       │\n│                                       │\n│                                       │\n│                                       │\nO───────────────────────────────────────O\nLegend: C=cue  1-9=object  H=helper  X=blocker  O=pocket  ·=path"
  },
  {
    "id": "sotd-48",
    "name": "Swing-Cut Showboat",
    "difficulty": "Hard",
    "difficulty_rating": 3,
    "category": "position",
    "speed_category": "medium",
    "tip_zone": "3-right",
    "cue_ball_start": {
      "x": 93.8,
      "y": 33
    },
    "object_ball_positions": [
      {
        "ballId": 1,
        "x": 90,
        "y": 12,
        "role": "object"
      }
    ],
    "intended_path": [
      {
        "from": {
          "x": 93.8,
          "y": 33
        },
        "to": {
          "x": 90,
          "y": 12
        }
      },
      {
        "from": {
          "x": 90,
          "y": 12
        },
        "to": {
          "x": 100,
          "y": 0
        }
      }
    ],
    "english": {
      "tip_zone": "3-right",
      "sidespin": 0.65,
      "backspin": 0,
      "follow": 0,
      "label": "right"
    },
    "landing_zones": [
      {
        "x": 100,
        "y": 0,
        "label": "pocket"
      },
      {
        "x": 76.3,
        "y": 3.5,
        "label": "cb_rest"
      }
    ],
    "pocket_target": {
      "x": 100,
      "y": 0
    },
    "coordinate_system": {
      "x": "0=head rail → 100=foot rail",
      "y": "0=bottom long rail → 50=top long rail",
      "units": "normalized table percent (9-foot aspect 2:1)"
    },
    "source": "catalogue",
    "ascii_table": "O───────────────────────────────────────O\n│                                       │\n│                                       │\n│                                       │\n│                                       │\n│                                    C  │\n│                                   ·   │\n│                                   ·   │\n│                                   ·   │\n│                                  ·    │\n│                                  1    │\n│                                   ·   │\n│                                    ·· │\n│                                      O│\nO───────────────────────────────────────O\nLegend: C=cue  1-9=object  H=helper  X=blocker  O=pocket  ·=path"
  },
  {
    "id": "sotd-49",
    "name": "Impossible-Looking Thin Cut",
    "difficulty": "Insane",
    "difficulty_rating": 4,
    "category": "position",
    "speed_category": "feather",
    "tip_zone": "center",
    "cue_ball_start": {
      "x": 73.5,
      "y": 21.9
    },
    "object_ball_positions": [
      {
        "ballId": 1,
        "x": 80,
        "y": 1.2,
        "role": "object"
      }
    ],
    "intended_path": [
      {
        "from": {
          "x": 73.5,
          "y": 21.9
        },
        "to": {
          "x": 80,
          "y": 1.2
        }
      },
      {
        "from": {
          "x": 80,
          "y": 1.2
        },
        "to": {
          "x": 100,
          "y": 0
        }
      }
    ],
    "english": {
      "tip_zone": "center",
      "sidespin": 0,
      "backspin": 0,
      "follow": 0,
      "label": "none"
    },
    "landing_zones": [
      {
        "x": 100,
        "y": 0,
        "label": "pocket"
      },
      {
        "x": 77.5,
        "y": 6.3,
        "label": "cb_rest"
      }
    ],
    "pocket_target": {
      "x": 100,
      "y": 0
    },
    "coordinate_system": {
      "x": "0=head rail → 100=foot rail",
      "y": "0=bottom long rail → 50=top long rail",
      "units": "normalized table percent (9-foot aspect 2:1)"
    },
    "source": "catalogue",
    "ascii_table": "O───────────────────────────────────────O\n│                                       │\n│                                       │\n│                                       │\n│                                       │\n│                                       │\n│                                       │\n│                                       │\n│                            C          │\n│                            ·          │\n│                             ·         │\n│                             ·         │\n│                              ·        │\n│                              1 ·· ·· O│\nO───────────────────────────────────────O\nLegend: C=cue  1-9=object  H=helper  X=blocker  O=pocket  ·=path"
  },
  {
    "id": "sotd-50",
    "name": "Venom-Style Jump-Curve Tease",
    "difficulty": "Insane",
    "difficulty_rating": 4,
    "category": "jump",
    "speed_category": "firm",
    "tip_zone": "1:30-high-right",
    "cue_ball_start": {
      "x": 51.1,
      "y": 12.4
    },
    "object_ball_positions": [
      {
        "ballId": 1,
        "x": 84,
        "y": 14,
        "role": "object"
      }
    ],
    "intended_path": [
      {
        "from": {
          "x": 51.1,
          "y": 12.4
        },
        "to": {
          "x": 54.6,
          "y": 14.3
        },
        "kind": "ground",
        "style": "solid"
      },
      {
        "from": {
          "x": 54.6,
          "y": 14.3
        },
        "to": {
          "x": 60.7,
          "y": 17.7
        },
        "kind": "airborne",
        "style": "dashed"
      },
      {
        "from": {
          "x": 60.7,
          "y": 17.7
        },
        "to": {
          "x": 62.7,
          "y": 18.7
        },
        "kind": "ground",
        "style": "solid"
      },
      {
        "from": {
          "x": 62.7,
          "y": 18.7
        },
        "to": {
          "x": 64.8,
          "y": 19.4
        },
        "kind": "ground",
        "style": "solid"
      },
      {
        "from": {
          "x": 64.8,
          "y": 19.4
        },
        "to": {
          "x": 66.8,
          "y": 20
        },
        "kind": "ground",
        "style": "solid"
      },
      {
        "from": {
          "x": 66.8,
          "y": 20
        },
        "to": {
          "x": 68.8,
          "y": 20.2
        },
        "kind": "ground",
        "style": "solid"
      },
      {
        "from": {
          "x": 68.8,
          "y": 20.2
        },
        "to": {
          "x": 70.8,
          "y": 20.3
        },
        "kind": "ground",
        "style": "solid"
      },
      {
        "from": {
          "x": 70.8,
          "y": 20.3
        },
        "to": {
          "x": 72.8,
          "y": 20.1
        },
        "kind": "ground",
        "style": "solid"
      },
      {
        "from": {
          "x": 72.8,
          "y": 20.1
        },
        "to": {
          "x": 74.8,
          "y": 19.6
        },
        "kind": "ground",
        "style": "solid"
      },
      {
        "from": {
          "x": 74.8,
          "y": 19.6
        },
        "to": {
          "x": 76.8,
          "y": 19
        },
        "kind": "ground",
        "style": "solid"
      },
      {
        "from": {
          "x": 76.8,
          "y": 19
        },
        "to": {
          "x": 78.7,
          "y": 18.1
        },
        "kind": "ground",
        "style": "solid"
      },
      {
        "from": {
          "x": 78.7,
          "y": 18.1
        },
        "to": {
          "x": 80.7,
          "y": 16.9
        },
        "kind": "ground",
        "style": "solid"
      },
      {
        "from": {
          "x": 80.7,
          "y": 16.9
        },
        "to": {
          "x": 84,
          "y": 14
        },
        "kind": "ground",
        "style": "solid"
      },
      {
        "from": {
          "x": 84,
          "y": 14
        },
        "to": {
          "x": 100,
          "y": 0
        },
        "kind": "object",
        "style": "solid"
      }
    ],
    "english": {
      "tip_zone": "1:30-high-right",
      "sidespin": 0.45,
      "backspin": 0,
      "follow": 0.5,
      "label": "high-right"
    },
    "landing_zones": [
      {
        "x": 100,
        "y": 0,
        "label": "pocket"
      },
      {
        "x": 92.7,
        "y": 12,
        "label": "cb_rest"
      }
    ],
    "pocket_target": {
      "x": 100,
      "y": 0
    },
    "coordinate_system": {
      "x": "0=head rail → 100=foot rail",
      "y": "0=bottom long rail → 50=top long rail",
      "units": "normalized table percent (9-foot aspect 2:1)"
    },
    "source": "catalogue",
    "ascii_table": "O───────────────────────────────────────O\n│                                       │\n│                                       │\n│                                       │\n│                                       │\n│                                       │\n│                                       │\n│                                       │\n│                        ······         │\n│                      ··      ··       │\n│                   C·           1·     │\n│                                  ·    │\n│                                    ·· │\n│                                      O│\nO───────────────────────────────────────O\nLegend: C=cue  1-9=object  H=helper  X=blocker  O=pocket  ·=path"
  },
  {
    "id": "sotd-51",
    "name": "Massey Mirror Banks",
    "difficulty": "Hard",
    "difficulty_rating": 3,
    "category": "bank",
    "speed_category": "medium",
    "tip_zone": "center",
    "cue_ball_start": {
      "x": 21.6,
      "y": 20
    },
    "object_ball_positions": [
      {
        "ballId": 1,
        "x": 28,
        "y": 4.2,
        "role": "object"
      },
      {
        "ballId": 2,
        "x": 72,
        "y": 4.2,
        "role": "prop"
      }
    ],
    "intended_path": [
      {
        "from": {
          "x": 21.6,
          "y": 20
        },
        "to": {
          "x": 28,
          "y": 4.2
        }
      },
      {
        "from": {
          "x": 28,
          "y": 4.2
        },
        "to": {
          "x": 29.7,
          "y": 0
        }
      },
      {
        "from": {
          "x": 29.7,
          "y": 0
        },
        "to": {
          "x": 50,
          "y": 50
        }
      }
    ],
    "english": {
      "tip_zone": "center",
      "sidespin": 0,
      "backspin": 0,
      "follow": 0,
      "label": "none"
    },
    "landing_zones": [
      {
        "x": 50,
        "y": 50,
        "label": "pocket"
      },
      {
        "x": 26.5,
        "y": 7.9,
        "label": "cb_rest"
      }
    ],
    "pocket_target": {
      "x": 50,
      "y": 50
    },
    "extra_object_paths": [
      {
        "ballId": 2,
        "pts": [
          {
            "x": 72,
            "y": 4.2
          },
          {
            "x": 70.3,
            "y": 0
          },
          {
            "x": 50,
            "y": 50
          }
        ],
        "faded": true
      }
    ],
    "ghost_ball": {
      "x": 26.3,
      "y": 8.3,
      "show": false
    },
    "coordinate_system": {
      "x": "0=head rail → 100=foot rail",
      "y": "0=bottom long rail → 50=top long rail",
      "units": "normalized table percent (9-foot aspect 2:1)"
    },
    "source": "catalogue",
    "ascii_table": "O───────────────────────────────────────O\n│                   O                   │\n│                  ·                    │\n│                  ·                    │\n│                 ·                     │\n│                 ·                     │\n│                ·                      │\n│               ·                       │\n│        C     ·                        │\n│         ·    ·                        │\n│         ·   ·                         │\n│          · ·                          │\n│           1·              2           │\n│                                       │\nO───────────────────────────────────────O\nLegend: C=cue  1-9=object  H=helper  X=blocker  O=pocket  ·=path"
  },
  {
    "id": "sotd-52",
    "name": "Rapid-Fire Spot Shots",
    "difficulty": "Medium",
    "difficulty_rating": 2,
    "category": "novelty",
    "speed_category": "medium",
    "tip_zone": "center",
    "cue_ball_start": {
      "x": 18,
      "y": 10
    },
    "object_ball_positions": [
      {
        "ballId": 1,
        "x": 75,
        "y": 25,
        "role": "object"
      }
    ],
    "intended_path": [
      {
        "from": {
          "x": 18,
          "y": 10
        },
        "to": {
          "x": 75,
          "y": 25
        }
      },
      {
        "from": {
          "x": 75,
          "y": 25
        },
        "to": {
          "x": 100,
          "y": 50
        }
      }
    ],
    "english": {
      "tip_zone": "center",
      "sidespin": 0,
      "backspin": 0,
      "follow": 0,
      "label": "none"
    },
    "landing_zones": [
      {
        "x": 100,
        "y": 50,
        "label": "pocket"
      },
      {
        "x": 78.4,
        "y": 18.5,
        "label": "cb_rest"
      }
    ],
    "pocket_target": {
      "x": 100,
      "y": 50
    },
    "coordinate_system": {
      "x": "0=head rail → 100=foot rail",
      "y": "0=bottom long rail → 50=top long rail",
      "units": "normalized table percent (9-foot aspect 2:1)"
    },
    "source": "catalogue",
    "ascii_table": "O───────────────────────────────────────O\n│                                      O│\n│                                    ·· │\n│                                   ·   │\n│                                 ··    │\n│                                ·      │\n│                              ··       │\n│                          ·· 1         │\n│                    ·· ··              │\n│              · ···                    │\n│        · ·· ·                         │\n│       C                               │\n│                                       │\n│                                       │\nO───────────────────────────────────────O\nLegend: C=cue  1-9=object  H=helper  X=blocker  O=pocket  ·=path"
  }
];

export function getSotdMapById(id: string): SotdShotMap | undefined {
  return SOTD_SHOT_MAPS.find((m) => m.id === id);
}

export function listSotdMaps(): SotdShotMap[] {
  return SOTD_SHOT_MAPS;
}

export function sotdMapCount(): number {
  return SOTD_SHOT_MAPS.length;
}
