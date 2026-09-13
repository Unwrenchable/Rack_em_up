/**
 * Structured Shot-of-the-Day maps for all 52 catalogue shots.
 * Internal geometry only (x 0–100 head→foot, y 0–50 near→far). Offline-safe Rack catalogue.
 * Frontend renders instructor-style diagrams with original drill tokens (not cards),
 * dual paths (cue + object), real ball colors, and human coaching — never raw coords/legends.
 * Geometry is validated locally (sotd-shot-map-geometry.ts). Do not generate maps via RealAI.
 */

export type SotdPoint = { x: number; y: number };

export type SotdObjectBall = SotdPoint & {
  ballId: number;
  role?: 'object' | 'blocker' | 'prop';
};

export type SotdPathSegment = {
  from: SotdPoint;
  to: SotdPoint;
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
      "x": 66.5,
      "y": 21.7
    },
    "object_ball_positions": [
      {
        "ballId": 1,
        "x": 62.5,
        "y": 4.2,
        "role": "object"
      },
      {
        "ballId": 9,
        "x": 78,
        "y": 38,
        "role": "object"
      }
    ],
    "intended_path": [
      {
        "from": {
          "x": 66.5,
          "y": 21.7
        },
        "to": {
          "x": 62.5,
          "y": 4.2
        }
      },
      {
        "from": {
          "x": 62.5,
          "y": 4.2
        },
        "to": {
          "x": 61.5,
          "y": 0
        }
      },
      {
        "from": {
          "x": 61.5,
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
        "x": 64.1,
        "y": 3,
        "label": "cb_rest"
      }
    ],
    "pocket_target": {
      "x": 50,
      "y": 50
    },
    "coordinate_system": {
      "x": "0=head rail → 100=foot rail",
      "y": "0=bottom long rail → 50=top long rail",
      "units": "normalized table percent (9-foot aspect 2:1)"
    },
    "source": "catalogue",
    "ascii_table": "O───────────────────────────────────────O\n│                   O                   │\n│                   ·                   │\n│                    ·                  │\n│                    ·         9        │\n│                    ·                  │\n│                     ·                 │\n│                     ·                 │\n│                      ·  C             │\n│                      ·  ·             │\n│                      · ·              │\n│                       ··              │\n│                       ·1              │\n│                                       │\nO───────────────────────────────────────O\nLegend: C=cue  1-9=object  X=blocker  O=pocket  ·=path"
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
      "x": 64.5,
      "y": 18.8
    },
    "object_ball_positions": [
      {
        "ballId": 1,
        "x": 75,
        "y": 28,
        "role": "object"
      }
    ],
    "intended_path": [
      {
        "from": {
          "x": 64.5,
          "y": 18.8
        },
        "to": {
          "x": 75,
          "y": 28
        }
      },
      {
        "from": {
          "x": 75,
          "y": 28
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
        "x": 70.5,
        "y": 24,
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
    "ascii_table": "O───────────────────────────────────────O\n│                                      O│\n│                                    ·· │\n│                                  ·    │\n│                                ··     │\n│                               ·       │\n│                             1·        │\n│                           ··          │\n│                         C·            │\n│                                       │\n│                                       │\n│                                       │\n│                                       │\n│                                       │\nO───────────────────────────────────────O\nLegend: C=cue  1-9=object  X=blocker  O=pocket  ·=path"
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
      "x": 66,
      "y": 29.9
    },
    "object_ball_positions": [
      {
        "ballId": 1,
        "x": 75,
        "y": 22,
        "role": "object"
      }
    ],
    "intended_path": [
      {
        "from": {
          "x": 66,
          "y": 29.9
        },
        "to": {
          "x": 75,
          "y": 22
        }
      },
      {
        "from": {
          "x": 75,
          "y": 22
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
        "x": 64.5,
        "y": 31.2,
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
    "ascii_table": "O───────────────────────────────────────O\n│                                       │\n│                                       │\n│                                       │\n│                                       │\n│                                       │\n│                         C·            │\n│                           ·           │\n│                             1·        │\n│                               ·       │\n│                                ··     │\n│                                  ·    │\n│                                    ·· │\n│                                      O│\nO───────────────────────────────────────O\nLegend: C=cue  1-9=object  X=blocker  O=pocket  ·=path"
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
      "x": 52.6,
      "y": 19.3
    },
    "object_ball_positions": [
      {
        "ballId": 1,
        "x": 66,
        "y": 28,
        "role": "object"
      },
      {
        "ballId": 2,
        "x": 76,
        "y": 35,
        "role": "prop"
      },
      {
        "ballId": 3,
        "x": 84,
        "y": 41,
        "role": "prop"
      }
    ],
    "intended_path": [
      {
        "from": {
          "x": 52.6,
          "y": 19.3
        },
        "to": {
          "x": 66,
          "y": 28
        }
      },
      {
        "from": {
          "x": 66,
          "y": 28
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
        "x": 77.8,
        "y": 35.6,
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
    "ascii_table": "O───────────────────────────────────────O\n│                                      O│\n│                                   · · │\n│                                3··    │\n│                              · ·      │\n│                            ·2         │\n│                         1·            │\n│                       ··              │\n│                    C·                 │\n│                                       │\n│                                       │\n│                                       │\n│                                       │\n│                                       │\nO───────────────────────────────────────O\nLegend: C=cue  1-9=object  X=blocker  O=pocket  ·=path"
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
      "x": 30,
      "y": 16
    },
    "object_ball_positions": [
      {
        "ballId": 1,
        "x": 64,
        "y": 30,
        "role": "object"
      },
      {
        "ballId": 8,
        "x": 46,
        "y": 20,
        "role": "blocker"
      }
    ],
    "intended_path": [
      {
        "from": {
          "x": 30,
          "y": 16
        },
        "to": {
          "x": 64,
          "y": 30
        }
      },
      {
        "from": {
          "x": 64,
          "y": 30
        },
        "to": {
          "x": 100,
          "y": 50
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
        "y": 50,
        "label": "pocket"
      },
      {
        "x": 69.5,
        "y": 40.3,
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
    "ascii_table": "O───────────────────────────────────────O\n│                                     ·O│\n│                                  ··   │\n│                               · ·     │\n│                            · ·        │\n│                          ··           │\n│                       ·1              │\n│                   ···                 │\n│              · ·X                     │\n│           C ·                         │\n│                                       │\n│                                       │\n│                                       │\n│                                       │\nO───────────────────────────────────────O\nLegend: C=cue  1-9=object  X=blocker  O=pocket  ·=path"
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
      "x": 38,
      "y": 34
    },
    "object_ball_positions": [
      {
        "ballId": 1,
        "x": 70,
        "y": 20,
        "role": "object"
      }
    ],
    "intended_path": [
      {
        "from": {
          "x": 38,
          "y": 34
        },
        "to": {
          "x": 70,
          "y": 20
        }
      },
      {
        "from": {
          "x": 70,
          "y": 20
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
        "x": 75.5,
        "y": 9.6,
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
    "ascii_table": "O───────────────────────────────────────O\n│                                       │\n│                                       │\n│                                       │\n│                                       │\n│              C ·                      │\n│                 ·· ·                  │\n│                     · ··              │\n│                         · 1           │\n│                            ··         │\n│                              · ·      │\n│                                 ··    │\n│                                   · · │\n│                                      O│\nO───────────────────────────────────────O\nLegend: C=cue  1-9=object  X=blocker  O=pocket  ·=path"
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
      "y": 10
    },
    "object_ball_positions": [
      {
        "ballId": 1,
        "x": 86,
        "y": 38,
        "role": "object"
      }
    ],
    "intended_path": [
      {
        "from": {
          "x": 14,
          "y": 10
        },
        "to": {
          "x": 34.8,
          "y": 0
        }
      },
      {
        "from": {
          "x": 34.8,
          "y": 0
        },
        "to": {
          "x": 100,
          "y": 31.3
        }
      },
      {
        "from": {
          "x": 100,
          "y": 31.3
        },
        "to": {
          "x": 86,
          "y": 38
        }
      },
      {
        "from": {
          "x": 86,
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
        "x": 81.4,
        "y": 34.1,
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
    "ascii_table": "O───────────────────────────────────────O\n│                                      O│\n│                                    ·· │\n│                                  ··   │\n│                                 1·    │\n│                                   · · │\n│                                   · · │\n│                                · ·    │\n│                            · ··       │\n│                          ··           │\n│                     · ··              │\n│     C ··          ··                  │\n│         · ·    ··                     │\n│            ·  ·                       │\nO───────────────────────────────────────O\nLegend: C=cue  1-9=object  X=blocker  O=pocket  ·=path"
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
      "x": 54.3,
      "y": 25.1
    },
    "object_ball_positions": [
      {
        "ballId": 1,
        "x": 66.6,
        "y": 31.8,
        "role": "object"
      },
      {
        "ballId": 2,
        "x": 78,
        "y": 38,
        "role": "object"
      }
    ],
    "intended_path": [
      {
        "from": {
          "x": 54.3,
          "y": 25.1
        },
        "to": {
          "x": 66.6,
          "y": 31.8
        }
      },
      {
        "from": {
          "x": 66.6,
          "y": 31.8
        },
        "to": {
          "x": 78,
          "y": 38
        }
      },
      {
        "from": {
          "x": 78,
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
        "x": 61.3,
        "y": 28.9,
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
    "ascii_table": "O───────────────────────────────────────O\n│                                     ·O│\n│                                  ··   │\n│                               ··      │\n│                            · 2        │\n│                         1 ·           │\n│                       ··              │\n│                     C·                │\n│                                       │\n│                                       │\n│                                       │\n│                                       │\n│                                       │\n│                                       │\nO───────────────────────────────────────O\nLegend: C=cue  1-9=object  X=blocker  O=pocket  ·=path"
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
      "x": 40.3,
      "y": 36.2
    },
    "object_ball_positions": [
      {
        "ballId": 9,
        "x": 74,
        "y": 16,
        "role": "object"
      },
      {
        "ballId": 1,
        "x": 54,
        "y": 28,
        "role": "object"
      }
    ],
    "intended_path": [
      {
        "from": {
          "x": 40.3,
          "y": 36.2
        },
        "to": {
          "x": 54,
          "y": 28
        }
      },
      {
        "from": {
          "x": 54,
          "y": 28
        },
        "to": {
          "x": 74,
          "y": 16
        }
      },
      {
        "from": {
          "x": 74,
          "y": 16
        },
        "to": {
          "x": 100,
          "y": 0
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
        "y": 0,
        "label": "pocket"
      },
      {
        "x": 86,
        "y": 8.8,
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
    "ascii_table": "O───────────────────────────────────────O\n│                                       │\n│                                       │\n│                                       │\n│               C                       │\n│                 ··                    │\n│                   · 1                 │\n│                      ··               │\n│                        · ·            │\n│                           ·9          │\n│                             · ·       │\n│                                ··     │\n│                                  · ·  │\n│                                     ·O│\nO───────────────────────────────────────O\nLegend: C=cue  1-9=object  X=blocker  O=pocket  ·=path"
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
      "x": 46,
      "y": 24
    },
    "object_ball_positions": [
      {
        "ballId": 1,
        "x": 84,
        "y": 5.5,
        "role": "object"
      }
    ],
    "intended_path": [
      {
        "from": {
          "x": 46,
          "y": 24
        },
        "to": {
          "x": 84,
          "y": 5.5
        }
      },
      {
        "from": {
          "x": 84,
          "y": 5.5
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
        "x": 78.3,
        "y": 7.5,
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
    "ascii_table": "O───────────────────────────────────────O\n│                                       │\n│                                       │\n│                                       │\n│                                       │\n│                                       │\n│                                       │\n│                 C                     │\n│                   ···                 │\n│                       ··              │\n│                         · ··          │\n│                             · ·       │\n│                                1· ·   │\n│                                    · O│\nO───────────────────────────────────────O\nLegend: C=cue  1-9=object  X=blocker  O=pocket  ·=path"
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
      "x": 52.2,
      "y": 2.2
    },
    "object_ball_positions": [
      {
        "ballId": 1,
        "x": 72,
        "y": 22,
        "role": "object"
      }
    ],
    "intended_path": [
      {
        "from": {
          "x": 52.2,
          "y": 2.2
        },
        "to": {
          "x": 72,
          "y": 22
        }
      },
      {
        "from": {
          "x": 72,
          "y": 22
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
        "x": 81.9,
        "y": 31.9,
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
    "ascii_table": "O───────────────────────────────────────O\n│                                      O│\n│                                    ·· │\n│                                   ·   │\n│                                 ··    │\n│                                ·      │\n│                             · ·       │\n│                            ·          │\n│                          ·1           │\n│                         ·             │\n│                       ··              │\n│                      ·                │\n│                    C·                 │\n│                                       │\nO───────────────────────────────────────O\nLegend: C=cue  1-9=object  X=blocker  O=pocket  ·=path"
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
      "x": 62.3,
      "y": 47.2
    },
    "object_ball_positions": [
      {
        "ballId": 1,
        "x": 76,
        "y": 30,
        "role": "object"
      }
    ],
    "intended_path": [
      {
        "from": {
          "x": 62.3,
          "y": 47.2
        },
        "to": {
          "x": 76,
          "y": 30
        }
      },
      {
        "from": {
          "x": 76,
          "y": 30
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
        "x": 67.3,
        "y": 40.9,
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
    "ascii_table": "O───────────────────────────────────────O\n│                                       │\n│                        C·             │\n│                         ·             │\n│                          ··           │\n│                            ·          │\n│                             1         │\n│                              ··       │\n│                                ·      │\n│                                 ·     │\n│                                  ·    │\n│                                   ·   │\n│                                    ·· │\n│                                      O│\nO───────────────────────────────────────O\nLegend: C=cue  1-9=object  X=blocker  O=pocket  ·=path"
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
      "x": 50.6,
      "y": 18.6
    },
    "object_ball_positions": [
      {
        "ballId": 9,
        "x": 36,
        "y": 12,
        "role": "object"
      },
      {
        "ballId": 1,
        "x": 58,
        "y": 30,
        "role": "object"
      }
    ],
    "intended_path": [
      {
        "from": {
          "x": 50.6,
          "y": 18.6
        },
        "to": {
          "x": 36,
          "y": 12
        }
      },
      {
        "from": {
          "x": 36,
          "y": 12
        },
        "to": {
          "x": 9.7,
          "y": 0
        }
      },
      {
        "from": {
          "x": 9.7,
          "y": 0
        },
        "to": {
          "x": 0,
          "y": 4.4
        }
      },
      {
        "from": {
          "x": 0,
          "y": 4.4
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
        "x": 30.8,
        "y": 8.9,
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
    "ascii_table": "O───────────────────────────────────────O\n│                                     ·O│\n│                                  ··   │\n│                              ···      │\n│                           ··          │\n│                       ···             │\n│                    ··1                │\n│               · ··                    │\n│             ··                        │\n│          ··    · ·C                   │\n│      ···     9·                       │\n│   ··    · ··                          │\n│ ·     ··                              │\n│  ·  ·                                 │\nO───────────────────────────────────────O\nLegend: C=cue  1-9=object  X=blocker  O=pocket  ·=path"
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
      "x": 26,
      "y": 18
    },
    "object_ball_positions": [
      {
        "ballId": 1,
        "x": 72,
        "y": 34,
        "role": "object"
      },
      {
        "ballId": 8,
        "x": 50,
        "y": 26,
        "role": "blocker"
      }
    ],
    "intended_path": [
      {
        "from": {
          "x": 26,
          "y": 18
        },
        "to": {
          "x": 38,
          "y": 10
        }
      },
      {
        "from": {
          "x": 38,
          "y": 10
        },
        "to": {
          "x": 54,
          "y": 16
        }
      },
      {
        "from": {
          "x": 54,
          "y": 16
        },
        "to": {
          "x": 72,
          "y": 34
        }
      },
      {
        "from": {
          "x": 72,
          "y": 34
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
        "x": 85.2,
        "y": 38.6,
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
    "ascii_table": "O───────────────────────────────────────O\n│                                     ·O│\n│                                  ··   │\n│                               · ·     │\n│                             ··        │\n│                           1           │\n│                         ··            │\n│                   X    ·              │\n│                      ··               │\n│          C·                           │\n│            ··  ·· ·                   │\n│                                       │\n│                                       │\n│                                       │\nO───────────────────────────────────────O\nLegend: C=cue  1-9=object  X=blocker  O=pocket  ·=path"
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
      "x": 26,
      "y": 24
    },
    "object_ball_positions": [
      {
        "ballId": 1,
        "x": 78,
        "y": 20,
        "role": "object"
      },
      {
        "ballId": 7,
        "x": 50,
        "y": 22,
        "role": "blocker"
      }
    ],
    "intended_path": [
      {
        "from": {
          "x": 26,
          "y": 24
        },
        "to": {
          "x": 78,
          "y": 20
        }
      },
      {
        "from": {
          "x": 78,
          "y": 20
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
        "x": 73.6,
        "y": 24,
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
    "ascii_table": "O───────────────────────────────────────O\n│                                       │\n│                                       │\n│                                       │\n│                                       │\n│                                       │\n│                                       │\n│          C· ··                        │\n│                ·· X ·· ·· ·· 1        │\n│                               ·       │\n│                                ··     │\n│                                  ·    │\n│                                    ·· │\n│                                      O│\nO───────────────────────────────────────O\nLegend: C=cue  1-9=object  X=blocker  O=pocket  ·=path"
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
      "x": 34,
      "y": 14
    },
    "object_ball_positions": [
      {
        "ballId": 1,
        "x": 64,
        "y": 36,
        "role": "object"
      },
      {
        "ballId": 5,
        "x": 48,
        "y": 28,
        "role": "blocker"
      }
    ],
    "intended_path": [
      {
        "from": {
          "x": 34,
          "y": 14
        },
        "to": {
          "x": 24,
          "y": 28
        }
      },
      {
        "from": {
          "x": 24,
          "y": 28
        },
        "to": {
          "x": 40,
          "y": 42
        }
      },
      {
        "from": {
          "x": 40,
          "y": 42
        },
        "to": {
          "x": 64,
          "y": 36
        }
      },
      {
        "from": {
          "x": 64,
          "y": 36
        },
        "to": {
          "x": 100,
          "y": 50
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
        "x": 100,
        "y": 50,
        "label": "pocket"
      },
      {
        "x": 52.7,
        "y": 27.7,
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
    "ascii_table": "O───────────────────────────────────────O\n│                                     ·O│\n│                                 ···   │\n│                 ··         · ··       │\n│             ··     ·· ·1 ··           │\n│            ·                          │\n│          ·       X                    │\n│          ·                            │\n│           ·                           │\n│            ·                          │\n│             C                         │\n│                                       │\n│                                       │\n│                                       │\nO───────────────────────────────────────O\nLegend: C=cue  1-9=object  X=blocker  O=pocket  ·=path"
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
      "x": 16,
      "y": 12
    },
    "object_ball_positions": [
      {
        "ballId": 1,
        "x": 80,
        "y": 36,
        "role": "object"
      }
    ],
    "intended_path": [
      {
        "from": {
          "x": 16,
          "y": 12
        },
        "to": {
          "x": 32,
          "y": 0
        }
      },
      {
        "from": {
          "x": 32,
          "y": 0
        },
        "to": {
          "x": 80,
          "y": 36
        }
      },
      {
        "from": {
          "x": 80,
          "y": 36
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
        "x": 75.1,
        "y": 32.6,
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
    "ascii_table": "O───────────────────────────────────────O\n│                                      O│\n│                                   · · │\n│                                 ··    │\n│                              1 ·      │\n│                             ·         │\n│                           ··          │\n│                        · ·            │\n│                      ··               │\n│                     ·                 │\n│      C           ··                   │\n│       · ·      ··                     │\n│          ·· · ·                       │\n│                                       │\nO───────────────────────────────────────O\nLegend: C=cue  1-9=object  X=blocker  O=pocket  ·=path"
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
      "x": 64.9,
      "y": 30.7
    },
    "object_ball_positions": [
      {
        "ballId": 1,
        "x": 77.2,
        "y": 37.5,
        "role": "object"
      },
      {
        "ballId": 2,
        "x": 80,
        "y": 39,
        "role": "object"
      }
    ],
    "intended_path": [
      {
        "from": {
          "x": 64.9,
          "y": 30.7
        },
        "to": {
          "x": 77.2,
          "y": 37.5
        }
      },
      {
        "from": {
          "x": 77.2,
          "y": 37.5
        },
        "to": {
          "x": 80,
          "y": 39
        }
      },
      {
        "from": {
          "x": 80,
          "y": 39
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
        "x": 71.9,
        "y": 34.6,
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
    "ascii_table": "O───────────────────────────────────────O\n│                                     ·O│\n│                                  ··   │\n│                                ··     │\n│                            ·12        │\n│                          ··           │\n│                         C             │\n│                                       │\n│                                       │\n│                                       │\n│                                       │\n│                                       │\n│                                       │\n│                                       │\nO───────────────────────────────────────O\nLegend: C=cue  1-9=object  X=blocker  O=pocket  ·=path"
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
      "x": 82.5,
      "y": 16.5
    },
    "object_ball_positions": [
      {
        "ballId": 1,
        "x": 70,
        "y": 6.5,
        "role": "object"
      },
      {
        "ballId": 9,
        "x": 42,
        "y": 34,
        "role": "object"
      }
    ],
    "intended_path": [
      {
        "from": {
          "x": 82.5,
          "y": 16.5
        },
        "to": {
          "x": 70,
          "y": 6.5
        }
      },
      {
        "from": {
          "x": 70,
          "y": 6.5
        },
        "to": {
          "x": 61.9,
          "y": 0
        }
      },
      {
        "from": {
          "x": 61.9,
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
        "x": 75.1,
        "y": 3.3,
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
    "ascii_table": "O───────────────────────────────────────O\n│O                                      │\n│ ··                                    │\n│    ··                                 │\n│      ·                                │\n│       ··       9                      │\n│         · ·                           │\n│            ·                          │\n│             ··                        │\n│               ··              C       │\n│                  ·          ··        │\n│                   ··      1·          │\n│                     ··  ··            │\n│                                       │\nO───────────────────────────────────────O\nLegend: C=cue  1-9=object  X=blocker  O=pocket  ·=path"
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
      "x": 35.7,
      "y": 11.4
    },
    "object_ball_positions": [
      {
        "ballId": 1,
        "x": 70,
        "y": 32,
        "role": "object"
      }
    ],
    "intended_path": [
      {
        "from": {
          "x": 35.7,
          "y": 11.4
        },
        "to": {
          "x": 70,
          "y": 32
        }
      },
      {
        "from": {
          "x": 70,
          "y": 32
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
        "x": 64.9,
        "y": 28.9,
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
    "ascii_table": "O───────────────────────────────────────O\n│                                     ·O│\n│                                  ··   │\n│                                ··     │\n│                             ··        │\n│                           1·          │\n│                        ··             │\n│                     · ·               │\n│                   ··                  │\n│                ··                     │\n│              C·                       │\n│                                       │\n│                                       │\n│                                       │\nO───────────────────────────────────────O\nLegend: C=cue  1-9=object  X=blocker  O=pocket  ·=path"
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
      "x": 25.6,
      "y": 4.5
    },
    "object_ball_positions": [
      {
        "ballId": 1,
        "x": 22,
        "y": 18,
        "role": "object"
      },
      {
        "ballId": 9,
        "x": 48,
        "y": 32,
        "role": "object"
      }
    ],
    "intended_path": [
      {
        "from": {
          "x": 25.6,
          "y": 4.5
        },
        "to": {
          "x": 22,
          "y": 18
        }
      },
      {
        "from": {
          "x": 22,
          "y": 18
        },
        "to": {
          "x": 13.4,
          "y": 50
        }
      },
      {
        "from": {
          "x": 13.4,
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
        "x": 20.4,
        "y": 15.8,
        "label": "cb_rest"
      }
    ],
    "pocket_target": {
      "x": 0,
      "y": 0
    },
    "coordinate_system": {
      "x": "0=head rail → 100=foot rail",
      "y": "0=bottom long rail → 50=top long rail",
      "units": "normalized table percent (9-foot aspect 2:1)"
    },
    "source": "catalogue",
    "ascii_table": "O───────────────────────────────────────O\n│                                       │\n│     ··                                │\n│    · ·                                │\n│    · ·                                │\n│    ·  ·          9                    │\n│   ·   ·                               │\n│  ··    ·                              │\n│  ·     ·                              │\n│  ·     1·                             │\n│ ·       ·                             │\n│ ·       ·                             │\n│·         C                            │\n│O                                      │\nO───────────────────────────────────────O\nLegend: C=cue  1-9=object  X=blocker  O=pocket  ·=path"
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
        "x": 52.5,
        "y": 4.4,
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
          "x": 34.3,
          "y": 50
        }
      },
      {
        "from": {
          "x": 34.3,
          "y": 50
        },
        "to": {
          "x": 52.5,
          "y": 4.4
        }
      },
      {
        "from": {
          "x": 52.5,
          "y": 4.4
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
        "x": 55.5,
        "y": 9.6,
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
    "ascii_table": "O───────────────────────────────────────O\n│                                       │\n│             ··                        │\n│            · ·                        │\n│           ·   ·                       │\n│          ·    ·                       │\n│          ·     ·                      │\n│         ·       ·                     │\n│         ·        ·                    │\n│        ·         ·                    │\n│        C          ·                   │\n│                   ·                   │\n│                   ·1                  │\n│                   O                   │\nO───────────────────────────────────────O\nLegend: C=cue  1-9=object  X=blocker  O=pocket  ·=path"
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
      "x": 58.3,
      "y": 14.3
    },
    "object_ball_positions": [
      {
        "ballId": 1,
        "x": 72,
        "y": 26,
        "role": "object"
      },
      {
        "ballId": 2,
        "x": 76,
        "y": 22,
        "role": "prop"
      },
      {
        "ballId": 3,
        "x": 76,
        "y": 30,
        "role": "prop"
      }
    ],
    "intended_path": [
      {
        "from": {
          "x": 58.3,
          "y": 14.3
        },
        "to": {
          "x": 72,
          "y": 26
        }
      },
      {
        "from": {
          "x": 72,
          "y": 26
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
        "x": 67.4,
        "y": 22.1,
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
    "ascii_table": "O───────────────────────────────────────O\n│                                      O│\n│                                    ·· │\n│                                  ·    │\n│                                ··     │\n│                              ··       │\n│                             3         │\n│                          ·1           │\n│                        ··   2         │\n│                       ·               │\n│                      C                │\n│                                       │\n│                                       │\n│                                       │\nO───────────────────────────────────────O\nLegend: C=cue  1-9=object  X=blocker  O=pocket  ·=path"
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
      "x": 16,
      "y": 24
    },
    "object_ball_positions": [
      {
        "ballId": 1,
        "x": 72,
        "y": 20,
        "role": "object"
      },
      {
        "ballId": 8,
        "x": 60,
        "y": 34,
        "role": "object"
      }
    ],
    "intended_path": [
      {
        "from": {
          "x": 16,
          "y": 24
        },
        "to": {
          "x": 46.5,
          "y": 0
        }
      },
      {
        "from": {
          "x": 46.5,
          "y": 0
        },
        "to": {
          "x": 72,
          "y": 20
        }
      },
      {
        "from": {
          "x": 72,
          "y": 20
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
        "x": 67.1,
        "y": 23.5,
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
    "ascii_table": "O───────────────────────────────────────O\n│                                       │\n│                                       │\n│                                       │\n│                                       │\n│                       8               │\n│                                       │\n│      C                                │\n│       ··                  1           │\n│          ·              ··  ··        │\n│           ··           ·      ··      │\n│             ··      · ·         ··    │\n│               · · ··               ·· │\n│                                      O│\nO───────────────────────────────────────O\nLegend: C=cue  1-9=object  X=blocker  O=pocket  ·=path"
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
      "x": 39.2,
      "y": 33.8
    },
    "object_ball_positions": [
      {
        "ballId": 9,
        "x": 70,
        "y": 15,
        "role": "object"
      },
      {
        "ballId": 1,
        "x": 52,
        "y": 26,
        "role": "object"
      }
    ],
    "intended_path": [
      {
        "from": {
          "x": 39.2,
          "y": 33.8
        },
        "to": {
          "x": 52,
          "y": 26
        }
      },
      {
        "from": {
          "x": 52,
          "y": 26
        },
        "to": {
          "x": 70,
          "y": 15
        }
      },
      {
        "from": {
          "x": 70,
          "y": 15
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
        "x": 81.9,
        "y": 7.7,
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
    "ascii_table": "O───────────────────────────────────────O\n│                                       │\n│                                       │\n│                                       │\n│                                       │\n│               C·                      │\n│                 · ·                   │\n│                    1·                 │\n│                      · ·              │\n│                         · 9           │\n│                            ··         │\n│                               ··      │\n│                                  ··   │\n│                                     ·O│\nO───────────────────────────────────────O\nLegend: C=cue  1-9=object  X=blocker  O=pocket  ·=path"
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
      "x": 34,
      "y": 32
    },
    "object_ball_positions": [
      {
        "ballId": 1,
        "x": 58,
        "y": 16,
        "role": "object"
      }
    ],
    "intended_path": [
      {
        "from": {
          "x": 34,
          "y": 32
        },
        "to": {
          "x": 58,
          "y": 16
        }
      },
      {
        "from": {
          "x": 58,
          "y": 16
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
        "x": 60.7,
        "y": 21.4,
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
    "ascii_table": "O───────────────────────────────────────O\n│                                       │\n│                                       │\n│                                       │\n│                                       │\n│             C                         │\n│              · ·                      │\n│                 ·                     │\n│                  ··                   │\n│                     ·1                │\n│                     ·                 │\n│                     ·                 │\n│                    ·                  │\n│                   O                   │\nO───────────────────────────────────────O\nLegend: C=cue  1-9=object  X=blocker  O=pocket  ·=path"
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
      "x": 23.1,
      "y": 18.7
    },
    "object_ball_positions": [
      {
        "ballId": 1,
        "x": 35,
        "y": 8,
        "role": "object"
      },
      {
        "ballId": 9,
        "x": 62,
        "y": 36,
        "role": "object"
      }
    ],
    "intended_path": [
      {
        "from": {
          "x": 23.1,
          "y": 18.7
        },
        "to": {
          "x": 35,
          "y": 8
        }
      },
      {
        "from": {
          "x": 35,
          "y": 8
        },
        "to": {
          "x": 44,
          "y": 0
        }
      },
      {
        "from": {
          "x": 44,
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
        "x": 30,
        "y": 4.7,
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
    "ascii_table": "O───────────────────────────────────────O\n│                                      O│\n│                                    ·· │\n│                                   ·   │\n│                        9       · ·    │\n│                              ··       │\n│                             ·         │\n│                           ··          │\n│                          ·            │\n│         C·            · ·             │\n│           ··        ··                │\n│             1      ·                  │\n│              · · ··                   │\n│                                       │\nO───────────────────────────────────────O\nLegend: C=cue  1-9=object  X=blocker  O=pocket  ·=path"
  },
  {
    "id": "sotd-28",
    "name": "Soft Safety: Hide Behind the 8",
    "difficulty": "Medium",
    "difficulty_rating": 2,
    "category": "kick",
    "speed_category": "feather",
    "tip_zone": "center",
    "cue_ball_start": {
      "x": 16,
      "y": 10
    },
    "object_ball_positions": [
      {
        "ballId": 1,
        "x": 78,
        "y": 36,
        "role": "object"
      },
      {
        "ballId": 8,
        "x": 58,
        "y": 22,
        "role": "prop"
      }
    ],
    "intended_path": [
      {
        "from": {
          "x": 16,
          "y": 10
        },
        "to": {
          "x": 29.5,
          "y": 0
        }
      },
      {
        "from": {
          "x": 29.5,
          "y": 0
        },
        "to": {
          "x": 78,
          "y": 36
        }
      },
      {
        "from": {
          "x": 78,
          "y": 36
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
        "x": 72.9,
        "y": 32.8,
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
    "ascii_table": "O───────────────────────────────────────O\n│                                     ·O│\n│                                  · ·  │\n│                                ··     │\n│                              1·       │\n│                            ·          │\n│                          ··           │\n│                       · ·             │\n│                     ·8                │\n│                    ·                  │\n│                 · ·                   │\n│      C·       ··                      │\n│         ·· · ·                        │\n│                                       │\nO───────────────────────────────────────O\nLegend: C=cue  1-9=object  X=blocker  O=pocket  ·=path"
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
      "x": 46,
      "y": 22
    },
    "object_ball_positions": [
      {
        "ballId": 1,
        "x": 72,
        "y": 7.5,
        "role": "object"
      }
    ],
    "intended_path": [
      {
        "from": {
          "x": 46,
          "y": 22
        },
        "to": {
          "x": 72,
          "y": 7.5
        }
      },
      {
        "from": {
          "x": 72,
          "y": 7.5
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
        "x": 59.8,
        "y": 14.3,
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
    "ascii_table": "O───────────────────────────────────────O\n│                                       │\n│                                       │\n│                                       │\n│                                       │\n│                                       │\n│                                       │\n│                                       │\n│                 C ·                   │\n│                    · ·                │\n│                       · ·             │\n│                          ·1 ·         │\n│                              · ·· ·   │\n│                                    · O│\nO───────────────────────────────────────O\nLegend: C=cue  1-9=object  X=blocker  O=pocket  ·=path"
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
      "x": 28,
      "y": 16
    },
    "object_ball_positions": [
      {
        "ballId": 1,
        "x": 70,
        "y": 34,
        "role": "object"
      },
      {
        "ballId": 8,
        "x": 50,
        "y": 24,
        "role": "blocker"
      }
    ],
    "intended_path": [
      {
        "from": {
          "x": 28,
          "y": 16
        },
        "to": {
          "x": 40,
          "y": 9
        }
      },
      {
        "from": {
          "x": 40,
          "y": 9
        },
        "to": {
          "x": 56,
          "y": 14
        }
      },
      {
        "from": {
          "x": 56,
          "y": 14
        },
        "to": {
          "x": 70,
          "y": 34
        }
      },
      {
        "from": {
          "x": 70,
          "y": 34
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
        "x": 82.9,
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
    "ascii_table": "O───────────────────────────────────────O\n│                                     ·O│\n│                                  ··   │\n│                                ··     │\n│                            ···        │\n│                           1           │\n│                         ··            │\n│                   X    ·              │\n│                       ·               │\n│           C          ·                │\n│            · ·   · ·                  │\n│                 ·                     │\n│                                       │\n│                                       │\nO───────────────────────────────────────O\nLegend: C=cue  1-9=object  X=blocker  O=pocket  ·=path"
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
      "x": 49.7,
      "y": 22
    },
    "object_ball_positions": [
      {
        "ballId": 1,
        "x": 61,
        "y": 28.3,
        "role": "object"
      },
      {
        "ballId": 2,
        "x": 71.5,
        "y": 34.2,
        "role": "object"
      },
      {
        "ballId": 3,
        "x": 82,
        "y": 40,
        "role": "object"
      }
    ],
    "intended_path": [
      {
        "from": {
          "x": 49.7,
          "y": 22
        },
        "to": {
          "x": 61,
          "y": 28.3
        }
      },
      {
        "from": {
          "x": 61,
          "y": 28.3
        },
        "to": {
          "x": 71.5,
          "y": 34.2
        }
      },
      {
        "from": {
          "x": 71.5,
          "y": 34.2
        },
        "to": {
          "x": 82,
          "y": 40
        }
      },
      {
        "from": {
          "x": 82,
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
        "x": 55.8,
        "y": 25.4,
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
    "ascii_table": "O───────────────────────────────────────O\n│                                     ·O│\n│                                  ··   │\n│                               3 ·     │\n│                             ··        │\n│                          ·2           │\n│                       1 ·             │\n│                    · ·                │\n│                   C                   │\n│                                       │\n│                                       │\n│                                       │\n│                                       │\n│                                       │\nO───────────────────────────────────────O\nLegend: C=cue  1-9=object  X=blocker  O=pocket  ·=path"
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
      "x": 24,
      "y": 18
    },
    "object_ball_positions": [
      {
        "ballId": 1,
        "x": 76,
        "y": 34,
        "role": "object"
      },
      {
        "ballId": 7,
        "x": 50,
        "y": 26,
        "role": "blocker"
      }
    ],
    "intended_path": [
      {
        "from": {
          "x": 24,
          "y": 18
        },
        "to": {
          "x": 76,
          "y": 34
        }
      },
      {
        "from": {
          "x": 76,
          "y": 34
        },
        "to": {
          "x": 100,
          "y": 50
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
        "y": 50,
        "label": "pocket"
      },
      {
        "x": 62.6,
        "y": 29.9,
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
    "ascii_table": "O───────────────────────────────────────O\n│                                      O│\n│                                   · · │\n│                                 ··    │\n│                              ··       │\n│                          ·· 1         │\n│                    · ·· ·             │\n│                · ·X                   │\n│           ··· ·                       │\n│         C                             │\n│                                       │\n│                                       │\n│                                       │\n│                                       │\nO───────────────────────────────────────O\nLegend: C=cue  1-9=object  X=blocker  O=pocket  ·=path"
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
      "x": 30,
      "y": 20
    },
    "object_ball_positions": [
      {
        "ballId": 1,
        "x": 56,
        "y": 4.6,
        "role": "object"
      }
    ],
    "intended_path": [
      {
        "from": {
          "x": 30,
          "y": 20
        },
        "to": {
          "x": 56,
          "y": 4.6
        }
      },
      {
        "from": {
          "x": 56,
          "y": 4.6
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
        "x": 44,
        "y": 11.7,
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
    "ascii_table": "O───────────────────────────────────────O\n│                                       │\n│                                       │\n│                                       │\n│                                       │\n│                                       │\n│                                       │\n│                                       │\n│           C                           │\n│             ··                        │\n│               ··                      │\n│                  ···                  │\n│                    ·1                 │\n│                   O                   │\nO───────────────────────────────────────O\nLegend: C=cue  1-9=object  X=blocker  O=pocket  ·=path"
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
      "x": 73.3,
      "y": 20.5
    },
    "object_ball_positions": [
      {
        "ballId": 1,
        "x": 68,
        "y": 4.4,
        "role": "object"
      },
      {
        "ballId": 9,
        "x": 82,
        "y": 34,
        "role": "object"
      }
    ],
    "intended_path": [
      {
        "from": {
          "x": 73.3,
          "y": 20.5
        },
        "to": {
          "x": 68,
          "y": 4.4
        }
      },
      {
        "from": {
          "x": 68,
          "y": 4.4
        },
        "to": {
          "x": 66.5,
          "y": 0
        }
      },
      {
        "from": {
          "x": 66.5,
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
        "x": 70.2,
        "y": 3,
        "label": "cb_rest"
      }
    ],
    "pocket_target": {
      "x": 50,
      "y": 50
    },
    "coordinate_system": {
      "x": "0=head rail → 100=foot rail",
      "y": "0=bottom long rail → 50=top long rail",
      "units": "normalized table percent (9-foot aspect 2:1)"
    },
    "source": "catalogue",
    "ascii_table": "O───────────────────────────────────────O\n│                   O                   │\n│                   ·                   │\n│                    ·                  │\n│                    ·                  │\n│                     ·         9       │\n│                     ·                 │\n│                      ·                │\n│                       ·    C          │\n│                       ·   ·           │\n│                        ·  ·           │\n│                        · ·            │\n│                         ·1            │\n│                                       │\nO───────────────────────────────────────O\nLegend: C=cue  1-9=object  X=blocker  O=pocket  ·=path"
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
      "x": 38.2,
      "y": 12
    },
    "object_ball_positions": [
      {
        "ballId": 1,
        "x": 74,
        "y": 34,
        "role": "object"
      }
    ],
    "intended_path": [
      {
        "from": {
          "x": 38.2,
          "y": 12
        },
        "to": {
          "x": 74,
          "y": 34
        }
      },
      {
        "from": {
          "x": 74,
          "y": 34
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
        "x": 68.9,
        "y": 30.9,
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
    "ascii_table": "O───────────────────────────────────────O\n│                                     ·O│\n│                                  · ·  │\n│                                ··     │\n│                             · ·       │\n│                           ·1          │\n│                        · ·            │\n│                      ··               │\n│                   · ·                 │\n│                 ··                    │\n│               C·                      │\n│                                       │\n│                                       │\n│                                       │\nO───────────────────────────────────────O\nLegend: C=cue  1-9=object  X=blocker  O=pocket  ·=path"
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
      "x": 14,
      "y": 14
    },
    "object_ball_positions": [
      {
        "ballId": 1,
        "x": 82,
        "y": 36,
        "role": "object"
      }
    ],
    "intended_path": [
      {
        "from": {
          "x": 14,
          "y": 14
        },
        "to": {
          "x": 63,
          "y": 50
        }
      },
      {
        "from": {
          "x": 63,
          "y": 50
        },
        "to": {
          "x": 82,
          "y": 36
        }
      },
      {
        "from": {
          "x": 82,
          "y": 36
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
        "x": 77.3,
        "y": 32.3,
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
    "ascii_table": "O───────────────────────────────────────O\n│                                      O│\n│                     · · ··         ·· │\n│                   ··       ··   · ·   │\n│                · ·           ·1·      │\n│               ·                       │\n│             ··                        │\n│          · ·                          │\n│        ··                             │\n│       ·                               │\n│     C                                 │\n│                                       │\n│                                       │\n│                                       │\nO───────────────────────────────────────O\nLegend: C=cue  1-9=object  X=blocker  O=pocket  ·=path"
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
        "x": 58,
        "y": 16,
        "role": "object"
      },
      {
        "ballId": 8,
        "x": 40,
        "y": 28,
        "role": "blocker"
      }
    ],
    "intended_path": [
      {
        "from": {
          "x": 22,
          "y": 14
        },
        "to": {
          "x": 40.5,
          "y": 50
        }
      },
      {
        "from": {
          "x": 40.5,
          "y": 50
        },
        "to": {
          "x": 58,
          "y": 16
        }
      },
      {
        "from": {
          "x": 58,
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
        "x": 64,
        "y": 24.3,
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
    "ascii_table": "O───────────────────────────────────────O\n│                                       │\n│               ··                      │\n│              ·  ·                     │\n│             ·    ·                    │\n│            ·      ·                   │\n│           ·   X   ·                   │\n│          ·         ·                  │\n│          ·          ·                 │\n│         ·            1                │\n│        C            ·                 │\n│                     ·                 │\n│                    ·                  │\n│                   O                   │\nO───────────────────────────────────────O\nLegend: C=cue  1-9=object  X=blocker  O=pocket  ·=path"
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
      "x": 40,
      "y": 16
    },
    "object_ball_positions": [
      {
        "ballId": 8,
        "x": 72,
        "y": 30,
        "role": "object"
      }
    ],
    "intended_path": [
      {
        "from": {
          "x": 40,
          "y": 16
        },
        "to": {
          "x": 72,
          "y": 30
        }
      },
      {
        "from": {
          "x": 72,
          "y": 30
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
        "x": 67.1,
        "y": 26.5,
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
    "ascii_table": "O───────────────────────────────────────O\n│                                      O│\n│                                    ·· │\n│                                 ··    │\n│                               ··      │\n│                             ··        │\n│                          ·8           │\n│                      ·· ·             │\n│                  ·· ·                 │\n│               C ·                     │\n│                                       │\n│                                       │\n│                                       │\n│                                       │\nO───────────────────────────────────────O\nLegend: C=cue  1-9=object  X=blocker  O=pocket  ·=path"
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
      "x": 18,
      "y": 12
    },
    "object_ball_positions": [
      {
        "ballId": 1,
        "x": 70,
        "y": 34,
        "role": "object"
      }
    ],
    "intended_path": [
      {
        "from": {
          "x": 18,
          "y": 12
        },
        "to": {
          "x": 56.8,
          "y": 0
        }
      },
      {
        "from": {
          "x": 56.8,
          "y": 0
        },
        "to": {
          "x": 100,
          "y": 13.4
        }
      },
      {
        "from": {
          "x": 100,
          "y": 13.4
        },
        "to": {
          "x": 0,
          "y": 44.3
        }
      },
      {
        "from": {
          "x": 0,
          "y": 44.3
        },
        "to": {
          "x": 18.3,
          "y": 50
        }
      },
      {
        "from": {
          "x": 18.3,
          "y": 50
        },
        "to": {
          "x": 70,
          "y": 34
        }
      },
      {
        "from": {
          "x": 70,
          "y": 34
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
        "x": 82.9,
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
    "ascii_table": "O───────────────────────────────────────O\n│      · ·                            ·O│\n│ · ··     ·· ··                   ··   │\n│ · ··          · ·· ·           ··     │\n│      ·· ··          ·· ·   ···        │\n│            ·· ·         · 1           │\n│                · ···                  │\n│                      ·· ·             │\n│                          · ·· ·       │\n│                                · ··   │\n│       C·                          · · │\n│          ·· ·                 ·· ·    │\n│              · ·· ·     ·· ··         │\n│                    ·  ·               │\nO───────────────────────────────────────O\nLegend: C=cue  1-9=object  X=blocker  O=pocket  ·=path"
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
      "x": 36.6,
      "y": 30.1
    },
    "object_ball_positions": [
      {
        "ballId": 1,
        "x": 48,
        "y": 22,
        "role": "object"
      },
      {
        "ballId": 2,
        "x": 62,
        "y": 12,
        "role": "object"
      }
    ],
    "intended_path": [
      {
        "from": {
          "x": 36.6,
          "y": 30.1
        },
        "to": {
          "x": 48,
          "y": 22
        }
      },
      {
        "from": {
          "x": 48,
          "y": 22
        },
        "to": {
          "x": 62,
          "y": 12
        }
      },
      {
        "from": {
          "x": 62,
          "y": 12
        },
        "to": {
          "x": 69.4,
          "y": 0
        }
      },
      {
        "from": {
          "x": 69.4,
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
        "x": 42.7,
        "y": 19.2,
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
    "ascii_table": "O───────────────────────────────────────O\n│                                      O│\n│                                     · │\n│                                    ·  │\n│                                   ·   │\n│                                  ·    │\n│              C·                 ·     │\n│                ··              ··     │\n│                  1 ·          ·       │\n│                     ·        ·        │\n│                      · 2    ·         │\n│                        ·   ··         │\n│                         ···           │\n│                                       │\nO───────────────────────────────────────O\nLegend: C=cue  1-9=object  X=blocker  O=pocket  ·=path"
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
      "x": 30,
      "y": 25
    },
    "object_ball_positions": [
      {
        "ballId": 1,
        "x": 64,
        "y": 18,
        "role": "object"
      },
      {
        "ballId": 8,
        "x": 64,
        "y": 32,
        "role": "object"
      }
    ],
    "intended_path": [
      {
        "from": {
          "x": 30,
          "y": 25
        },
        "to": {
          "x": 64,
          "y": 18
        }
      },
      {
        "from": {
          "x": 64,
          "y": 18
        },
        "to": {
          "x": 64,
          "y": 32
        }
      },
      {
        "from": {
          "x": 64,
          "y": 32
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
        "x": 58.6,
        "y": 20.7,
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
    "ascii_table": "O───────────────────────────────────────O\n│                                       │\n│                                       │\n│                                       │\n│                                       │\n│                        8              │\n│                        ··             │\n│           C ··         ·  ··          │\n│                ·· ··· ··    ·         │\n│                        1     ··       │\n│                                ··     │\n│                                   ·   │\n│                                    ·· │\n│                                      O│\nO───────────────────────────────────────O\nLegend: C=cue  1-9=object  X=blocker  O=pocket  ·=path"
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
      "x": 53.5,
      "y": 23.8
    },
    "object_ball_positions": [
      {
        "ballId": 1,
        "x": 64.8,
        "y": 30.2,
        "role": "object"
      },
      {
        "ballId": 2,
        "x": 74.4,
        "y": 35.6,
        "role": "object"
      },
      {
        "ballId": 3,
        "x": 84,
        "y": 41,
        "role": "object"
      }
    ],
    "intended_path": [
      {
        "from": {
          "x": 53.5,
          "y": 23.8
        },
        "to": {
          "x": 64.8,
          "y": 30.2
        }
      },
      {
        "from": {
          "x": 64.8,
          "y": 30.2
        },
        "to": {
          "x": 74.4,
          "y": 35.6
        }
      },
      {
        "from": {
          "x": 74.4,
          "y": 35.6
        },
        "to": {
          "x": 84,
          "y": 41
        }
      },
      {
        "from": {
          "x": 84,
          "y": 41
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
        "x": 59.6,
        "y": 27.3,
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
    "ascii_table": "O───────────────────────────────────────O\n│                                     ·O│\n│                                  · ·  │\n│                                3·     │\n│                            2· ·       │\n│                          ··           │\n│                       · 1             │\n│                    C ·                │\n│                                       │\n│                                       │\n│                                       │\n│                                       │\n│                                       │\n│                                       │\nO───────────────────────────────────────O\nLegend: C=cue  1-9=object  X=blocker  O=pocket  ·=path"
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
      "x": 36,
      "y": 22
    },
    "object_ball_positions": [
      {
        "ballId": 1,
        "x": 70,
        "y": 26,
        "role": "object"
      },
      {
        "ballId": 8,
        "x": 64,
        "y": 31.5,
        "role": "blocker"
      },
      {
        "ballId": 7,
        "x": 64,
        "y": 20.5,
        "role": "blocker"
      }
    ],
    "intended_path": [
      {
        "from": {
          "x": 36,
          "y": 22
        },
        "to": {
          "x": 70,
          "y": 26
        }
      },
      {
        "from": {
          "x": 70,
          "y": 26
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
        "x": 65.3,
        "y": 22.3,
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
    "ascii_table": "O───────────────────────────────────────O\n│                                      O│\n│                                    ·· │\n│                                 · ·   │\n│                               ··      │\n│                        X     ·        │\n│                            ··         │\n│                  ·· ·· ·· 1           │\n│              C· ·      X              │\n│                                       │\n│                                       │\n│                                       │\n│                                       │\n│                                       │\nO───────────────────────────────────────O\nLegend: C=cue  1-9=object  X=blocker  O=pocket  ·=path"
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
      "y": 10
    },
    "object_ball_positions": [
      {
        "ballId": 1,
        "x": 68,
        "y": 36,
        "role": "object"
      }
    ],
    "intended_path": [
      {
        "from": {
          "x": 20,
          "y": 10
        },
        "to": {
          "x": 35.1,
          "y": 0
        }
      },
      {
        "from": {
          "x": 35.1,
          "y": 0
        },
        "to": {
          "x": 100,
          "y": 42.9
        }
      },
      {
        "from": {
          "x": 100,
          "y": 42.9
        },
        "to": {
          "x": 89.2,
          "y": 50
        }
      },
      {
        "from": {
          "x": 89.2,
          "y": 50
        },
        "to": {
          "x": 68,
          "y": 36
        }
      },
      {
        "from": {
          "x": 68,
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
        "x": 80.3,
        "y": 42.7,
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
    "ascii_table": "O───────────────────────────────────────O\n│                                     ·O│\n│                               · ··· · │\n│                             ···     · │\n│                          1· ·    ··   │\n│                                ··     │\n│                              ·        │\n│                            ··         │\n│                         ··            │\n│                      · ·              │\n│                    ··                 │\n│        C·       · ·                   │\n│          ··   ··                      │\n│            ·                          │\nO───────────────────────────────────────O\nLegend: C=cue  1-9=object  X=blocker  O=pocket  ·=path"
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
      "x": 22,
      "y": 28
    },
    "object_ball_positions": [
      {
        "ballId": 1,
        "x": 80,
        "y": 18,
        "role": "object"
      },
      {
        "ballId": 7,
        "x": 50,
        "y": 24,
        "role": "blocker"
      }
    ],
    "intended_path": [
      {
        "from": {
          "x": 22,
          "y": 28
        },
        "to": {
          "x": 80,
          "y": 18
        }
      },
      {
        "from": {
          "x": 80,
          "y": 18
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
        "x": 75.5,
        "y": 22,
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
    "ascii_table": "O───────────────────────────────────────O\n│                                       │\n│                                       │\n│                                       │\n│                                       │\n│                                       │\n│        C ·                            │\n│           · ·· ·· X                   │\n│                    · ·· ···           │\n│                             ·1·       │\n│                                 ·     │\n│                                  ··   │\n│                                    ·· │\n│                                      O│\nO───────────────────────────────────────O\nLegend: C=cue  1-9=object  X=blocker  O=pocket  ·=path"
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
      "x": 24,
      "y": 20.7
    },
    "object_ball_positions": [
      {
        "ballId": 1,
        "x": 32,
        "y": 8,
        "role": "object"
      },
      {
        "ballId": 9,
        "x": 55,
        "y": 30,
        "role": "object"
      }
    ],
    "intended_path": [
      {
        "from": {
          "x": 24,
          "y": 20.7
        },
        "to": {
          "x": 32,
          "y": 8
        }
      },
      {
        "from": {
          "x": 32,
          "y": 8
        },
        "to": {
          "x": 37,
          "y": 0
        }
      },
      {
        "from": {
          "x": 37,
          "y": 0
        },
        "to": {
          "x": 68.5,
          "y": 50
        }
      },
      {
        "from": {
          "x": 68.5,
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
        "x": 26,
        "y": 8.7,
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
    "ascii_table": "O───────────────────────────────────────O\n│                                       │\n│                         · ·           │\n│                        ·   ·          │\n│                       ·     ·         │\n│                      ·       ·        │\n│                     9         ·       │\n│                    ·           ·      │\n│         C         ·             ·     │\n│          ·       ·               ·    │\n│           ·     ·                 ·   │\n│            1   ·                   ·  │\n│             · ·                     · │\n│                                      O│\nO───────────────────────────────────────O\nLegend: C=cue  1-9=object  X=blocker  O=pocket  ·=path"
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
      "x": 44.9,
      "y": 14.2
    },
    "object_ball_positions": [
      {
        "ballId": 1,
        "x": 60,
        "y": 24,
        "role": "object"
      },
      {
        "ballId": 8,
        "x": 64.8,
        "y": 24,
        "role": "prop"
      }
    ],
    "intended_path": [
      {
        "from": {
          "x": 44.9,
          "y": 14.2
        },
        "to": {
          "x": 60,
          "y": 24
        }
      },
      {
        "from": {
          "x": 60,
          "y": 24
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
        "x": 55,
        "y": 20.7,
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
    "ascii_table": "O───────────────────────────────────────O\n│                                      O│\n│                                   · · │\n│                                 ··    │\n│                              · ·      │\n│                            ··         │\n│                         · ·           │\n│                       1·8             │\n│                     ··                │\n│                  ··                   │\n│                 C                     │\n│                                       │\n│                                       │\n│                                       │\nO───────────────────────────────────────O\nLegend: C=cue  1-9=object  X=blocker  O=pocket  ·=path"
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
      "x": 38,
      "y": 38
    },
    "object_ball_positions": [
      {
        "ballId": 1,
        "x": 68,
        "y": 26,
        "role": "object"
      }
    ],
    "intended_path": [
      {
        "from": {
          "x": 38,
          "y": 38
        },
        "to": {
          "x": 68,
          "y": 26
        }
      },
      {
        "from": {
          "x": 68,
          "y": 26
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
        "x": 73.6,
        "y": 31.8,
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
    "ascii_table": "O───────────────────────────────────────O\n│                                       │\n│                                       │\n│                                       │\n│              C ·                      │\n│                 · ··                  │\n│                      ···              │\n│                          1·           │\n│                            ·          │\n│                             · ·       │\n│                                ·      │\n│                                 ··    │\n│                                    ·· │\n│                                      O│\nO───────────────────────────────────────O\nLegend: C=cue  1-9=object  X=blocker  O=pocket  ·=path"
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
      "x": 42,
      "y": 34
    },
    "object_ball_positions": [
      {
        "ballId": 1,
        "x": 82,
        "y": 8,
        "role": "object"
      }
    ],
    "intended_path": [
      {
        "from": {
          "x": 42,
          "y": 34
        },
        "to": {
          "x": 82,
          "y": 8
        }
      },
      {
        "from": {
          "x": 82,
          "y": 8
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
        "x": 76.5,
        "y": 10.4,
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
    "ascii_table": "O───────────────────────────────────────O\n│                                       │\n│                                       │\n│                                       │\n│                                       │\n│                C·                     │\n│                  · ·                  │\n│                     ··                │\n│                        ··             │\n│                          ·            │\n│                           · ·         │\n│                              ·1 ·     │\n│                                  ··   │\n│                                     ·O│\nO───────────────────────────────────────O\nLegend: C=cue  1-9=object  X=blocker  O=pocket  ·=path"
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
      "x": 24,
      "y": 16
    },
    "object_ball_positions": [
      {
        "ballId": 1,
        "x": 74,
        "y": 34,
        "role": "object"
      },
      {
        "ballId": 7,
        "x": 48,
        "y": 24,
        "role": "blocker"
      }
    ],
    "intended_path": [
      {
        "from": {
          "x": 24,
          "y": 16
        },
        "to": {
          "x": 40,
          "y": 9
        }
      },
      {
        "from": {
          "x": 40,
          "y": 9
        },
        "to": {
          "x": 74,
          "y": 34
        }
      },
      {
        "from": {
          "x": 74,
          "y": 34
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
        "x": 87.2,
        "y": 38.7,
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
    "ascii_table": "O───────────────────────────────────────O\n│                                     ·O│\n│                                  · ·  │\n│                                ··     │\n│                             · ·       │\n│                           ·1          │\n│                         ··            │\n│                  X    ·               │\n│                     ··                │\n│         C         ··                  │\n│           ·· · · ·                    │\n│                                       │\n│                                       │\n│                                       │\nO───────────────────────────────────────O\nLegend: C=cue  1-9=object  X=blocker  O=pocket  ·=path"
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
      "x": 78.4,
      "y": 20.4
    },
    "object_ball_positions": [
      {
        "ballId": 1,
        "x": 72,
        "y": 4.6,
        "role": "object"
      },
      {
        "ballId": 9,
        "x": 40,
        "y": 32,
        "role": "object"
      }
    ],
    "intended_path": [
      {
        "from": {
          "x": 78.4,
          "y": 20.4
        },
        "to": {
          "x": 72,
          "y": 4.6
        }
      },
      {
        "from": {
          "x": 72,
          "y": 4.6
        },
        "to": {
          "x": 70.1,
          "y": 0
        }
      },
      {
        "from": {
          "x": 70.1,
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
        "x": 74.6,
        "y": 3,
        "label": "cb_rest"
      }
    ],
    "pocket_target": {
      "x": 50,
      "y": 50
    },
    "coordinate_system": {
      "x": "0=head rail → 100=foot rail",
      "y": "0=bottom long rail → 50=top long rail",
      "units": "normalized table percent (9-foot aspect 2:1)"
    },
    "source": "catalogue",
    "ascii_table": "O───────────────────────────────────────O\n│                   O                   │\n│                    ·                  │\n│                    ·                  │\n│                     ·                 │\n│               9     ·                 │\n│                      ·                │\n│                       ·               │\n│                        ·     C        │\n│                        ·    ·         │\n│                         ·   ·         │\n│                         ·  ·          │\n│                          ·1           │\n│                                       │\nO───────────────────────────────────────O\nLegend: C=cue  1-9=object  X=blocker  O=pocket  ·=path"
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
      "x": 38,
      "y": 14
    },
    "object_ball_positions": [
      {
        "ballId": 1,
        "x": 75,
        "y": 25,
        "role": "object"
      },
      {
        "ballId": 8,
        "x": 62,
        "y": 36,
        "role": "object"
      }
    ],
    "intended_path": [
      {
        "from": {
          "x": 38,
          "y": 14
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
          "x": 62,
          "y": 36
        }
      },
      {
        "from": {
          "x": 62,
          "y": 36
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
        "x": 70.8,
        "y": 20.8,
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
    "ascii_table": "O───────────────────────────────────────O\n│                                     ·O│\n│                                · ··   │\n│                            ·· ·       │\n│                        8··            │\n│                         ·             │\n│                          ··           │\n│                           · 1         │\n│                     · ·· ·            │\n│                ·· ··                  │\n│              C                        │\n│                                       │\n│                                       │\n│                                       │\nO───────────────────────────────────────O\nLegend: C=cue  1-9=object  X=blocker  O=pocket  ·=path"
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
