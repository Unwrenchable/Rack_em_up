/**
 * Structured Shot-of-the-Day maps for all 52 catalogue shots.
 * Internal geometry only (x 0–100 head→foot, y 0–50 near→far). Offline-safe Rack catalogue.
 * Frontend renders instructor-style diagrams with original drill tokens (not cards),
 * dual paths (cue + object), real ball colors, and human coaching — never raw coords/legends.
 * Geometry is validated locally (sotd-shot-map-geometry.ts). Do not generate maps via RealAI.
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
  ghost_ball?: SotdGhostBall;
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
      "x": 66.6,
      "y": 20.9
    },
    "object_ball_positions": [
      {
        "ballId": 1,
        "x": 62.5,
        "y": 3.4,
        "role": "object"
      },
      {
        "ballId": 9,
        "x": 86,
        "y": 40,
        "role": "prop"
      }
    ],
    "intended_path": [
      {
        "from": {
          "x": 66.6,
          "y": 20.9
        },
        "to": {
          "x": 62.5,
          "y": 3.4
        }
      },
      {
        "from": {
          "x": 62.5,
          "y": 3.4
        },
        "to": {
          "x": 61.7,
          "y": 0
        }
      },
      {
        "from": {
          "x": 61.7,
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
    "ascii_table": "O───────────────────────────────────────O\n│                   O                   │\n│                   ·                   │\n│                    ·            9     │\n│                    ·                  │\n│                    ·                  │\n│                     ·                 │\n│                     ·                 │\n│                      ·  C             │\n│                      ·  ·             │\n│                      ·  ·             │\n│                       ··              │\n│                       ·1              │\n│                        ·              │\nO───────────────────────────────────────O\nLegend: C=cue  1-9=object  H=helper  X=blocker  O=pocket  ·=path"
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
      "x": 65.1,
      "y": 15.1
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
          "x": 65.1,
          "y": 15.1
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
    "ascii_table": "O───────────────────────────────────────O\n│                                      O│\n│                                    ·· │\n│                                   ·   │\n│                                 ··    │\n│                                ·      │\n│                              ··       │\n│                             1         │\n│                           ·           │\n│                         C·            │\n│                                       │\n│                                       │\n│                                       │\n│                                       │\nO───────────────────────────────────────O\nLegend: C=cue  1-9=object  H=helper  X=blocker  O=pocket  ·=path"
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
      "x": 65.8,
      "y": 34.2
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
          "x": 65.8,
          "y": 34.2
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
        "x": 65.1,
        "y": 34.9,
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
      "x": 57.9,
      "y": 7.9
    },
    "object_ball_positions": [
      {
        "ballId": 1,
        "x": 72,
        "y": 22,
        "role": "object"
      },
      {
        "ballId": 2,
        "x": 78,
        "y": 14,
        "role": "prop"
      },
      {
        "ballId": 3,
        "x": 84,
        "y": 14,
        "role": "prop"
      }
    ],
    "intended_path": [
      {
        "from": {
          "x": 57.9,
          "y": 7.9
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
    "ascii_table": "O───────────────────────────────────────O\n│                                      O│\n│                                    ·· │\n│                                   ·   │\n│                                 ··    │\n│                                ·      │\n│                             · ·       │\n│                            ·          │\n│                          ·1           │\n│                         ·             │\n│                       ··     2 3      │\n│                      C                │\n│                                       │\n│                                       │\nO───────────────────────────────────────O\nLegend: C=cue  1-9=object  H=helper  X=blocker  O=pocket  ·=path"
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
      "x": 58.1,
      "y": 17.8
    },
    "object_ball_positions": [
      {
        "ballId": 1,
        "x": 80,
        "y": 16,
        "role": "object"
      }
    ],
    "ghost_ball": {
      "x": 76.6,
      "y": 18.7,
      "show": true
    },
    "contact_point": {
      "x": 79.1,
      "y": 16.7
    },
    "intended_path": [
      {
        "from": {
          "x": 58.1,
          "y": 17.8
        },
        "to": {
          "x": 80,
          "y": 16
        }
      },
      {
        "from": {
          "x": 80,
          "y": 16
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
        "x": 86,
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
    "ascii_table": "O───────────────────────────────────────O\n│                                       │\n│                                       │\n│                                       │\n│                                       │\n│                                       │\n│                                       │\n│                                       │\n│                                       │\n│                      C· ·· ··1        │\n│                                ··     │\n│                                  ·    │\n│                                   · · │\n│                                      O│\nO───────────────────────────────────────O\nLegend: C=cue  1-9=object  H=helper  X=blocker  O=pocket  ·=path"
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
      "x": 64,
      "y": 36.1
    },
    "object_ball_positions": [
      {
        "ballId": 1,
        "x": 72,
        "y": 20,
        "role": "object"
      }
    ],
    "ghost_ball": {
      "x": 68.4,
      "y": 22.6,
      "show": true
    },
    "contact_point": {
      "x": 71,
      "y": 20.7
    },
    "intended_path": [
      {
        "from": {
          "x": 64,
          "y": 36.1
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
        "x": 74.7,
        "y": 6.6,
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
    "ascii_table": "O───────────────────────────────────────O\n│                                       │\n│                                       │\n│                                       │\n│                        C              │\n│                         ·             │\n│                          ·            │\n│                          ··           │\n│                           1           │\n│                             ··        │\n│                               ··      │\n│                                 ··    │\n│                                    ·· │\n│                                      O│\nO───────────────────────────────────────O\nLegend: C=cue  1-9=object  H=helper  X=blocker  O=pocket  ·=path"
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
      "x": 16,
      "y": 10
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
          "x": 16,
          "y": 10
        },
        "to": {
          "x": 36.8,
          "y": 0
        }
      },
      {
        "from": {
          "x": 36.8,
          "y": 0
        },
        "to": {
          "x": 100,
          "y": 30.3
        }
      },
      {
        "from": {
          "x": 100,
          "y": 30.3
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
        "x": 79.2,
        "y": 34.4,
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
    "ascii_table": "O───────────────────────────────────────O\n│                                      O│\n│                                    ·· │\n│                                 ··    │\n│                                1·     │\n│                                   ··  │\n│                                     · │\n│                                 ···   │\n│                              ··       │\n│                          ·· ·         │\n│                       · ·             │\n│      C· ·         · ··                │\n│          ··     ··                    │\n│             · ·                       │\nO───────────────────────────────────────O\nLegend: C=cue  1-9=object  H=helper  X=blocker  O=pocket  ·=path"
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
      "x": 65.1,
      "y": 15.1
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
          "x": 65.1,
          "y": 15.1
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
    "ascii_table": "O───────────────────────────────────────O\n│                                      O│\n│                                    ·· │\n│                                   ·   │\n│                                 ··    │\n│                                2      │\n│                              ··       │\n│                             1         │\n│                           ·           │\n│                         C·            │\n│                                       │\n│                                       │\n│                                       │\n│                                       │\nO───────────────────────────────────────O\nLegend: C=cue  1-9=object  H=helper  X=blocker  O=pocket  ·=path"
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
      "x": 38,
      "y": 12
    },
    "object_ball_positions": [
      {
        "ballId": 1,
        "x": 66,
        "y": 26,
        "role": "object"
      },
      {
        "ballId": 9,
        "x": 90,
        "y": 8,
        "role": "helper"
      }
    ],
    "ghost_ball": {
      "x": 63.9,
      "y": 22.1,
      "show": true
    },
    "contact_point": {
      "x": 65.4,
      "y": 24.9
    },
    "intended_path": [
      {
        "from": {
          "x": 38,
          "y": 12
        },
        "to": {
          "x": 65.4,
          "y": 24.9
        },
        "kind": "ground",
        "style": "solid"
      },
      {
        "from": {
          "x": 65.4,
          "y": 24.9
        },
        "to": {
          "x": 90,
          "y": 8
        },
        "kind": "ground",
        "style": "solid"
      },
      {
        "from": {
          "x": 90,
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
        "x": 84,
        "y": 14,
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
    "ascii_table": "O───────────────────────────────────────O\n│                                       │\n│                                       │\n│                 C                     │\n│                  ·                    │\n│                    ··                 │\n│                      H·               │\n│                        ··             │\n│                           ·           │\n│                            ·1         │\n│                              ··       │\n│                                 ··    │\n│                                   · · │\n│                                      O│\nO───────────────────────────────────────O\nLegend: C=cue  1-9=object  H=helper  X=blocker  O=pocket  ·=path"
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
      "x": 82.8,
      "y": 24.5
    },
    "object_ball_positions": [
      {
        "ballId": 1,
        "x": 86,
        "y": 4.8,
        "role": "object"
      }
    ],
    "ghost_ball": {
      "x": 81.8,
      "y": 6.2,
      "show": true
    },
    "contact_point": {
      "x": 84.9,
      "y": 5.2
    },
    "intended_path": [
      {
        "from": {
          "x": 82.8,
          "y": 24.5
        },
        "to": {
          "x": 86,
          "y": 4.8
        }
      },
      {
        "from": {
          "x": 86,
          "y": 4.8
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
        "x": 80.3,
        "y": 6.7,
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
    "ascii_table": "O───────────────────────────────────────O\n│                                       │\n│                                       │\n│                                       │\n│                                       │\n│                                       │\n│                                       │\n│                               C       │\n│                                ·      │\n│                                ·      │\n│                                ·      │\n│                                ·      │\n│                                 1··   │\n│                                     ·O│\nO───────────────────────────────────────O\nLegend: C=cue  1-9=object  H=helper  X=blocker  O=pocket  ·=path"
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
    "ascii_table": "O───────────────────────────────────────O\n│                                      O│\n│                                    ·· │\n│                                   ·   │\n│                                 ··    │\n│                                ·      │\n│                             · ·       │\n│                            ·          │\n│                          ·1           │\n│                         ·             │\n│                       ··              │\n│                      ·                │\n│                    C·                 │\n│                                       │\nO───────────────────────────────────────O\nLegend: C=cue  1-9=object  H=helper  X=blocker  O=pocket  ·=path"
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
    "ascii_table": "O───────────────────────────────────────O\n│                                       │\n│                        C·             │\n│                         ·             │\n│                          ··           │\n│                            ·          │\n│                             1         │\n│                              ··       │\n│                                ·      │\n│                                 ·     │\n│                                  ·    │\n│                                   ·   │\n│                                    ·· │\n│                                      O│\nO───────────────────────────────────────O\nLegend: C=cue  1-9=object  H=helper  X=blocker  O=pocket  ·=path"
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
      "x": 52.5,
      "y": 20.7
    },
    "object_ball_positions": [
      {
        "ballId": 9,
        "x": 38,
        "y": 14,
        "role": "object"
      }
    ],
    "intended_path": [
      {
        "from": {
          "x": 52.5,
          "y": 20.7
        },
        "to": {
          "x": 38,
          "y": 14
        }
      },
      {
        "from": {
          "x": 38,
          "y": 14
        },
        "to": {
          "x": 7.8,
          "y": 0
        }
      },
      {
        "from": {
          "x": 7.8,
          "y": 0
        },
        "to": {
          "x": 0,
          "y": 3.6
        }
      },
      {
        "from": {
          "x": 0,
          "y": 3.6
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
        "x": 32.8,
        "y": 11,
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
    "ascii_table": "O───────────────────────────────────────O\n│                                     ·O│\n│                                  ··   │\n│                              ·· ·     │\n│                           · ·         │\n│                       ·· ·            │\n│                    · ·                │\n│                · ··                   │\n│              ··   ·C                  │\n│          ···   ··                     │\n│       ··   ··9                        │\n│   ···   ··                            │\n│ ·    ··                               │\n│ ·  ·                                  │\nO───────────────────────────────────────O\nLegend: C=cue  1-9=object  H=helper  X=blocker  O=pocket  ·=path"
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
      "x": 28,
      "y": 16
    },
    "object_ball_positions": [
      {
        "ballId": 1,
        "x": 74,
        "y": 36,
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
          "x": 28,
          "y": 16
        },
        "to": {
          "x": 47,
          "y": 35.2
        }
      },
      {
        "from": {
          "x": 47,
          "y": 35.2
        },
        "to": {
          "x": 74,
          "y": 36
        }
      },
      {
        "from": {
          "x": 74,
          "y": 36
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
        "x": 86.8,
        "y": 41.6,
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
    "ascii_table": "O───────────────────────────────────────O\n│                                     ·O│\n│                                  ··   │\n│                               ··      │\n│                      · ·· ·1 ·        │\n│                 · · ·                 │\n│                ·                      │\n│              ··   X                   │\n│             ·                         │\n│           C·                          │\n│                                       │\n│                                       │\n│                                       │\n│                                       │\nO───────────────────────────────────────O\nLegend: C=cue  1-9=object  H=helper  X=blocker  O=pocket  ·=path"
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
      "x": 24,
      "y": 25.5
    },
    "object_ball_positions": [
      {
        "ballId": 1,
        "x": 70,
        "y": 25.2,
        "role": "object"
      },
      {
        "ballId": 7,
        "x": 45,
        "y": 25.2,
        "role": "blocker"
      }
    ],
    "intended_path": [
      {
        "from": {
          "x": 24,
          "y": 25.5
        },
        "to": {
          "x": 39,
          "y": 25.4
        },
        "kind": "ground",
        "style": "solid"
      },
      {
        "from": {
          "x": 39,
          "y": 25.4
        },
        "to": {
          "x": 45,
          "y": 30.5
        },
        "kind": "airborne",
        "style": "dashed"
      },
      {
        "from": {
          "x": 45,
          "y": 30.5
        },
        "to": {
          "x": 51,
          "y": 25.4
        },
        "kind": "airborne",
        "style": "dashed"
      },
      {
        "from": {
          "x": 51,
          "y": 25.4
        },
        "to": {
          "x": 70,
          "y": 25.2
        },
        "kind": "ground",
        "style": "solid"
      },
      {
        "from": {
          "x": 70,
          "y": 25.2
        },
        "to": {
          "x": 100,
          "y": 25
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
        "y": 25,
        "label": "pocket"
      },
      {
        "x": 64,
        "y": 25.2,
        "label": "cb_rest"
      }
    ],
    "pocket_target": {
      "x": 100,
      "y": 25
    },
    "coordinate_system": {
      "x": "0=head rail → 100=foot rail",
      "y": "0=bottom long rail → 50=top long rail",
      "units": "normalized table percent (9-foot aspect 2:1)"
    },
    "source": "catalogue",
    "ascii_table": "O───────────────────────────────────────O\n│                                       │\n│                                       │\n│                                       │\n│                                       │\n│                                       │\n│                · ·                    │\n│         C ···   X   ·· ·· 1·· ·· ·· ·O│\n│                                       │\n│                                       │\n│                                       │\n│                                       │\n│                                       │\n│                                       │\nO───────────────────────────────────────O\nLegend: C=cue  1-9=object  H=helper  X=blocker  O=pocket  ·=path"
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
      "x": 22,
      "y": 12
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
        "x": 40,
        "y": 24,
        "role": "blocker"
      }
    ],
    "intended_path": [
      {
        "from": {
          "x": 22,
          "y": 12
        },
        "to": {
          "x": 20,
          "y": 28
        }
      },
      {
        "from": {
          "x": 20,
          "y": 28
        },
        "to": {
          "x": 36,
          "y": 42
        }
      },
      {
        "from": {
          "x": 36,
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
        "x": 51.8,
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
    "ascii_table": "O───────────────────────────────────────O\n│                                     ·O│\n│                                 ···   │\n│               · ·          · ··       │\n│           ··     · ·· ·1 ··           │\n│          ·                            │\n│         ·                             │\n│        ·      X                       │\n│        ·                              │\n│        ·                              │\n│        C                              │\n│                                       │\n│                                       │\n│                                       │\nO───────────────────────────────────────O\nLegend: C=cue  1-9=object  H=helper  X=blocker  O=pocket  ·=path"
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
    "ascii_table": "O───────────────────────────────────────O\n│                                      O│\n│                                   · · │\n│                                 ··    │\n│                              1 ·      │\n│                             ·         │\n│                           ··          │\n│                        · ·            │\n│                      ··               │\n│                     ·                 │\n│      C           ··                   │\n│       · ·      ··                     │\n│          ·· · ·                       │\n│                                       │\nO───────────────────────────────────────O\nLegend: C=cue  1-9=object  H=helper  X=blocker  O=pocket  ·=path"
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
      "x": 71.2,
      "y": 33.5
    },
    "object_ball_positions": [
      {
        "ballId": 1,
        "x": 83.3,
        "y": 40.5,
        "role": "object"
      },
      {
        "ballId": 2,
        "x": 86,
        "y": 42,
        "role": "object"
      }
    ],
    "intended_path": [
      {
        "from": {
          "x": 71.2,
          "y": 33.5
        },
        "to": {
          "x": 83.3,
          "y": 40.5
        }
      },
      {
        "from": {
          "x": 83.3,
          "y": 40.5
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
    "ascii_table": "O───────────────────────────────────────O\n│                                     ·O│\n│                                  ··   │\n│                                12     │\n│                             · ·       │\n│                           C·          │\n│                                       │\n│                                       │\n│                                       │\n│                                       │\n│                                       │\n│                                       │\n│                                       │\n│                                       │\nO───────────────────────────────────────O\nLegend: C=cue  1-9=object  H=helper  X=blocker  O=pocket  ·=path"
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
      "x": 82.6,
      "y": 15.1
    },
    "object_ball_positions": [
      {
        "ballId": 1,
        "x": 70,
        "y": 5.2,
        "role": "object"
      }
    ],
    "intended_path": [
      {
        "from": {
          "x": 82.6,
          "y": 15.1
        },
        "to": {
          "x": 70,
          "y": 5.2
        }
      },
      {
        "from": {
          "x": 70,
          "y": 5.2
        },
        "to": {
          "x": 63.4,
          "y": 0
        }
      },
      {
        "from": {
          "x": 63.4,
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
        "y": 3,
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
    "ascii_table": "O───────────────────────────────────────O\n│O                                      │\n│ ··                                    │\n│    ··                                 │\n│      ·                                │\n│       ··                              │\n│          ··                           │\n│            ·                          │\n│             ··                        │\n│                ··             C       │\n│                  ·           ·        │\n│                   ··       ··         │\n│                      ·· · 1           │\n│                                       │\nO───────────────────────────────────────O\nLegend: C=cue  1-9=object  H=helper  X=blocker  O=pocket  ·=path"
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
      "x": 50.1,
      "y": 9.2
    },
    "object_ball_positions": [
      {
        "ballId": 1,
        "x": 78,
        "y": 32,
        "role": "object"
      }
    ],
    "intended_path": [
      {
        "from": {
          "x": 50.1,
          "y": 9.2
        },
        "to": {
          "x": 78,
          "y": 32
        }
      },
      {
        "from": {
          "x": 78,
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
        "x": 73.4,
        "y": 28.2,
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
    "ascii_table": "O───────────────────────────────────────O\n│                                      O│\n│                                    ·· │\n│                                 ··    │\n│                                ·      │\n│                              1·       │\n│                            ·          │\n│                          ··           │\n│                        ··             │\n│                       ·               │\n│                    ··                 │\n│                   C                   │\n│                                       │\n│                                       │\nO───────────────────────────────────────O\nLegend: C=cue  1-9=object  H=helper  X=blocker  O=pocket  ·=path"
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
      "x": 27.9,
      "y": 4.6
    },
    "object_ball_positions": [
      {
        "ballId": 1,
        "x": 24,
        "y": 18,
        "role": "object"
      }
    ],
    "intended_path": [
      {
        "from": {
          "x": 27.9,
          "y": 4.6
        },
        "to": {
          "x": 24,
          "y": 18
        }
      },
      {
        "from": {
          "x": 24,
          "y": 18
        },
        "to": {
          "x": 14.6,
          "y": 50
        }
      },
      {
        "from": {
          "x": 14.6,
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
        "x": 22.3,
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
    "ascii_table": "O───────────────────────────────────────O\n│                                       │\n│     ··                                │\n│     ··                                │\n│    ·  ·                               │\n│    ·  ·                               │\n│   ·    ·                              │\n│   ·    ·                              │\n│  ·      ·                             │\n│  ·      1                             │\n│ ·        ·                            │\n│ ·        ·                            │\n│·          C                           │\n│O                                      │\nO───────────────────────────────────────O\nLegend: C=cue  1-9=object  H=helper  X=blocker  O=pocket  ·=path"
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
        "x": 54,
        "y": 4.6,
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
          "x": 35,
          "y": 50
        }
      },
      {
        "from": {
          "x": 35,
          "y": 50
        },
        "to": {
          "x": 54,
          "y": 4.6
        }
      },
      {
        "from": {
          "x": 54,
          "y": 4.6
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
        "x": 57.9,
        "y": 9.1,
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
    "ascii_table": "O───────────────────────────────────────O\n│                                       │\n│             ··                        │\n│            ·  ·                       │\n│           ··  ·                       │\n│          ·     ·                      │\n│          ·     ··                     │\n│         ·        ·                    │\n│         ·        ·                    │\n│        ·          ·                   │\n│        C          ·                   │\n│                    ·                  │\n│                    ·1                 │\n│                   O                   │\nO───────────────────────────────────────O\nLegend: C=cue  1-9=object  H=helper  X=blocker  O=pocket  ·=path"
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
      "x": 56.4,
      "y": 12.2
    },
    "object_ball_positions": [
      {
        "ballId": 1,
        "x": 70,
        "y": 24,
        "role": "object"
      },
      {
        "ballId": 2,
        "x": 80,
        "y": 16,
        "role": "prop"
      },
      {
        "ballId": 3,
        "x": 80,
        "y": 10,
        "role": "prop"
      }
    ],
    "intended_path": [
      {
        "from": {
          "x": 56.4,
          "y": 12.2
        },
        "to": {
          "x": 70,
          "y": 24
        }
      },
      {
        "from": {
          "x": 70,
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
        "x": 65.5,
        "y": 20.1,
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
    "ascii_table": "O───────────────────────────────────────O\n│                                      O│\n│                                    ·· │\n│                                 · ·   │\n│                                ·      │\n│                              ··       │\n│                             ·         │\n│                           1·          │\n│                         ··            │\n│                       ·      2        │\n│                     C·                │\n│                              3        │\n│                                       │\n│                                       │\nO───────────────────────────────────────O\nLegend: C=cue  1-9=object  H=helper  X=blocker  O=pocket  ·=path"
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
        "x": 74,
        "y": 18,
        "role": "object"
      },
      {
        "ballId": 8,
        "x": 48,
        "y": 40,
        "role": "prop"
      }
    ],
    "intended_path": [
      {
        "from": {
          "x": 16,
          "y": 24
        },
        "to": {
          "x": 49.1,
          "y": 0
        }
      },
      {
        "from": {
          "x": 49.1,
          "y": 0
        },
        "to": {
          "x": 74,
          "y": 18
        }
      },
      {
        "from": {
          "x": 74,
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
        "x": 69.1,
        "y": 21.4,
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
    "ascii_table": "O───────────────────────────────────────O\n│                                       │\n│                                       │\n│                  8                    │\n│                                       │\n│                                       │\n│                                       │\n│      C                                │\n│       · ·                             │\n│          ·                ·1·         │\n│           ··            ··    ··      │\n│              ··      ··         ··    │\n│                ··  ··              ·· │\n│                                      O│\nO───────────────────────────────────────O\nLegend: C=cue  1-9=object  H=helper  X=blocker  O=pocket  ·=path"
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
      "x": 73.4,
      "y": 5.2
    },
    "object_ball_positions": [
      {
        "ballId": 1,
        "x": 76,
        "y": 2.5,
        "role": "object"
      }
    ],
    "ghost_ball": {
      "x": 71.6,
      "y": 3,
      "show": true
    },
    "contact_point": {
      "x": 74.8,
      "y": 2.6
    },
    "intended_path": [
      {
        "from": {
          "x": 73.4,
          "y": 5.2
        },
        "to": {
          "x": 74.8,
          "y": 2.6
        },
        "kind": "ground",
        "style": "solid"
      },
      {
        "from": {
          "x": 74.8,
          "y": 2.6
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
        "x": 70,
        "y": 6.5,
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
    "ascii_table": "O───────────────────────────────────────O\n│                                       │\n│                                       │\n│                                       │\n│                                       │\n│                                       │\n│                                       │\n│                                       │\n│                                       │\n│                                       │\n│                                       │\n│                                       │\n│                           C 1         │\n│                                · ·· ·O│\nO───────────────────────────────────────O\nLegend: C=cue  1-9=object  H=helper  X=blocker  O=pocket  ·=path"
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
      "x": 56,
      "y": 31.9
    },
    "object_ball_positions": [
      {
        "ballId": 1,
        "x": 58,
        "y": 14,
        "role": "object"
      }
    ],
    "ghost_ball": {
      "x": 60.2,
      "y": 17.8,
      "show": true
    },
    "contact_point": {
      "x": 58.6,
      "y": 15
    },
    "intended_path": [
      {
        "from": {
          "x": 56,
          "y": 31.9
        },
        "to": {
          "x": 58,
          "y": 14
        }
      },
      {
        "from": {
          "x": 58,
          "y": 14
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
        "x": 61,
        "y": 19.2,
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
    "ascii_table": "O───────────────────────────────────────O\n│                                       │\n│                                       │\n│                                       │\n│                                       │\n│                     C                 │\n│                     ·                 │\n│                      ·                │\n│                      ·                │\n│                      ·                │\n│                     ·1                │\n│                     ·                 │\n│                    ·                  │\n│                   O                   │\nO───────────────────────────────────────O\nLegend: C=cue  1-9=object  H=helper  X=blocker  O=pocket  ·=path"
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
      "x": 37.9,
      "y": 26.4
    },
    "object_ball_positions": [
      {
        "ballId": 1,
        "x": 48,
        "y": 14,
        "role": "object"
      }
    ],
    "intended_path": [
      {
        "from": {
          "x": 37.9,
          "y": 26.4
        },
        "to": {
          "x": 48,
          "y": 14
        }
      },
      {
        "from": {
          "x": 48,
          "y": 14
        },
        "to": {
          "x": 59.4,
          "y": 0
        }
      },
      {
        "from": {
          "x": 59.4,
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
        "x": 43.1,
        "y": 10.6,
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
    "ascii_table": "O───────────────────────────────────────O\n│                                      O│\n│                                     · │\n│                                   ··  │\n│                                  ·    │\n│                                 ·     │\n│                               ··      │\n│              C·              ·        │\n│                ·            ·         │\n│                 ·         ··          │\n│                  1·      ·            │\n│                    ·    ·             │\n│                     ·· ·              │\n│                                       │\nO───────────────────────────────────────O\nLegend: C=cue  1-9=object  H=helper  X=blocker  O=pocket  ·=path"
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
        "x": 80,
        "y": 36,
        "role": "object"
      },
      {
        "ballId": 8,
        "x": 42,
        "y": 40,
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
          "x": 29.9,
          "y": 0
        }
      },
      {
        "from": {
          "x": 29.9,
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
    "ascii_table": "O───────────────────────────────────────O\n│                                      O│\n│                                   · · │\n│                8                ··    │\n│                              1 ·      │\n│                             ·         │\n│                           ··          │\n│                        ··             │\n│                      ··               │\n│                    ·                  │\n│                  ··                   │\n│      C·       ··                      │\n│         ··  ··                        │\n│                                       │\nO───────────────────────────────────────O\nLegend: C=cue  1-9=object  H=helper  X=blocker  O=pocket  ·=path"
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
      "x": 64.9,
      "y": 20.4
    },
    "object_ball_positions": [
      {
        "ballId": 1,
        "x": 74,
        "y": 7.2,
        "role": "object"
      }
    ],
    "intended_path": [
      {
        "from": {
          "x": 64.9,
          "y": 20.4
        },
        "to": {
          "x": 74,
          "y": 7.2
        }
      },
      {
        "from": {
          "x": 74,
          "y": 7.2
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
        "x": 66.1,
        "y": 18.7,
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
    "ascii_table": "O───────────────────────────────────────O\n│                                       │\n│                                       │\n│                                       │\n│                                       │\n│                                       │\n│                                       │\n│                                       │\n│                         C             │\n│                          ·            │\n│                          ··           │\n│                            1          │\n│                              ··· ·    │\n│                                   · ·O│\nO───────────────────────────────────────O\nLegend: C=cue  1-9=object  H=helper  X=blocker  O=pocket  ·=path"
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
      "y": 14
    },
    "object_ball_positions": [
      {
        "ballId": 1,
        "x": 72,
        "y": 36,
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
          "y": 14
        },
        "to": {
          "x": 45.1,
          "y": 34.8
        }
      },
      {
        "from": {
          "x": 45.1,
          "y": 34.8
        },
        "to": {
          "x": 72,
          "y": 36
        }
      },
      {
        "from": {
          "x": 72,
          "y": 36
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
        "x": 84.5,
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
    "ascii_table": "O───────────────────────────────────────O\n│                                     ·O│\n│                                  ··   │\n│                               · ·     │\n│                       ·· ·1 ··        │\n│                ·  ·· ·                │\n│               ·                       │\n│             ··    X                   │\n│            ·                          │\n│            ·                          │\n│           C                           │\n│                                       │\n│                                       │\n│                                       │\nO───────────────────────────────────────O\nLegend: C=cue  1-9=object  H=helper  X=blocker  O=pocket  ·=path"
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
        "x": 61.7,
        "y": 28.1,
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
      "x": 24,
      "y": 16
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
          "x": 44,
          "y": 22.9
        },
        "kind": "ground",
        "style": "solid"
      },
      {
        "from": {
          "x": 44,
          "y": 22.9
        },
        "to": {
          "x": 50,
          "y": 21
        },
        "kind": "airborne",
        "style": "dashed"
      },
      {
        "from": {
          "x": 50,
          "y": 21
        },
        "to": {
          "x": 56,
          "y": 27.1
        },
        "kind": "airborne",
        "style": "dashed"
      },
      {
        "from": {
          "x": 56,
          "y": 27.1
        },
        "to": {
          "x": 76,
          "y": 34
        },
        "kind": "ground",
        "style": "solid"
      },
      {
        "from": {
          "x": 76,
          "y": 34
        },
        "to": {
          "x": 100,
          "y": 50
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
        "y": 50,
        "label": "pocket"
      },
      {
        "x": 62.8,
        "y": 29.4,
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
    "ascii_table": "O───────────────────────────────────────O\n│                                      O│\n│                                   · · │\n│                                 ··    │\n│                              ··       │\n│                           · 1         │\n│                       ·· ·            │\n│                   X·                  │\n│            · ··  ·                    │\n│         C ·                           │\n│                                       │\n│                                       │\n│                                       │\n│                                       │\nO───────────────────────────────────────O\nLegend: C=cue  1-9=object  H=helper  X=blocker  O=pocket  ·=path"
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
      "x": 67.6,
      "y": 17.6
    },
    "object_ball_positions": [
      {
        "ballId": 1,
        "x": 58,
        "y": 4.8,
        "role": "object"
      }
    ],
    "ghost_ball": {
      "x": 61.8,
      "y": 7.1,
      "show": true
    },
    "contact_point": {
      "x": 59,
      "y": 5.4
    },
    "intended_path": [
      {
        "from": {
          "x": 67.6,
          "y": 17.6
        },
        "to": {
          "x": 58,
          "y": 4.8
        }
      },
      {
        "from": {
          "x": 58,
          "y": 4.8
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
        "x": 66.4,
        "y": 16,
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
    "ascii_table": "O───────────────────────────────────────O\n│                                       │\n│                                       │\n│                                       │\n│                                       │\n│                                       │\n│                                       │\n│                                       │\n│                                       │\n│                          C            │\n│                        ··             │\n│                       ·               │\n│                     ·1                │\n│                   O                   │\nO───────────────────────────────────────O\nLegend: C=cue  1-9=object  H=helper  X=blocker  O=pocket  ·=path"
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
      "x": 44.3,
      "y": 14.5
    },
    "object_ball_positions": [
      {
        "ballId": 1,
        "x": 78,
        "y": 36,
        "role": "object"
      }
    ],
    "intended_path": [
      {
        "from": {
          "x": 44.3,
          "y": 14.5
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
    "ascii_table": "O───────────────────────────────────────O\n│                                     ·O│\n│                                  · ·  │\n│                                ··     │\n│                              1·       │\n│                           ··          │\n│                         ··            │\n│                      ··               │\n│                   · ·                 │\n│                  ·                    │\n│                 C                     │\n│                                       │\n│                                       │\n│                                       │\nO───────────────────────────────────────O\nLegend: C=cue  1-9=object  H=helper  X=blocker  O=pocket  ·=path"
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
      "x": 16,
      "y": 12
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
          "x": 16,
          "y": 12
        },
        "to": {
          "x": 64.2,
          "y": 50
        }
      },
      {
        "from": {
          "x": 64.2,
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
    "ascii_table": "O───────────────────────────────────────O\n│                                      O│\n│                      ··  ··        ·· │\n│                    ··      ··   · ·   │\n│                  ·           ·1·      │\n│                ··                     │\n│             · ·                       │\n│            ·                          │\n│          ··                           │\n│         ·                             │\n│      C·                               │\n│                                       │\n│                                       │\n│                                       │\nO───────────────────────────────────────O\nLegend: C=cue  1-9=object  H=helper  X=blocker  O=pocket  ·=path"
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
          "x": 39.5,
          "y": 50
        }
      },
      {
        "from": {
          "x": 39.5,
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
        "x": 62,
        "y": 24.4,
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
    "ascii_table": "O───────────────────────────────────────O\n│                                       │\n│              · ·                      │\n│              · ·                      │\n│            ··   ·                     │\n│            ·     ·                    │\n│           ·      ··                   │\n│          ·         ·                  │\n│          ·          ·                 │\n│         ·           1                 │\n│        C            ·                 │\n│                    ·                  │\n│                    ·                  │\n│                   O                   │\nO───────────────────────────────────────O\nLegend: C=cue  1-9=object  H=helper  X=blocker  O=pocket  ·=path"
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
      "x": 52,
      "y": 26.7
    },
    "object_ball_positions": [
      {
        "ballId": 8,
        "x": 70,
        "y": 28,
        "role": "object"
      }
    ],
    "intended_path": [
      {
        "from": {
          "x": 52,
          "y": 26.7
        },
        "to": {
          "x": 70,
          "y": 28
        }
      },
      {
        "from": {
          "x": 70,
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
        "x": 65.2,
        "y": 24.5,
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
    "ascii_table": "O───────────────────────────────────────O\n│                                      O│\n│                                   · · │\n│                                 ··    │\n│                                ·      │\n│                             ··        │\n│                       ··· 8·          │\n│                    C·                 │\n│                                       │\n│                                       │\n│                                       │\n│                                       │\n│                                       │\n│                                       │\nO───────────────────────────────────────O\nLegend: C=cue  1-9=object  H=helper  X=blocker  O=pocket  ·=path"
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
      "x": 16,
      "y": 12
    },
    "object_ball_positions": [
      {
        "ballId": 1,
        "x": 70,
        "y": 40,
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
          "x": 91.4,
          "y": 50
        }
      },
      {
        "from": {
          "x": 91.4,
          "y": 50
        },
        "to": {
          "x": 100,
          "y": 45.7
        }
      },
      {
        "from": {
          "x": 100,
          "y": 45.7
        },
        "to": {
          "x": 9.4,
          "y": 0
        }
      },
      {
        "from": {
          "x": 9.4,
          "y": 0
        },
        "to": {
          "x": 0,
          "y": 4.7
        }
      },
      {
        "from": {
          "x": 0,
          "y": 4.7
        },
        "to": {
          "x": 70,
          "y": 40
        }
      },
      {
        "from": {
          "x": 70,
          "y": 40
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
        "x": 82.4,
        "y": 46.4,
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
    "ascii_table": "O───────────────────────────────────────O\n│                                 ·   ·O│\n│                               ·· ···· │\n│                           1·· ·  ··   │\n│                        ·· ·   ··      │\n│                     ···    · ·        │\n│                 ····   · ··           │\n│               ···   · ·               │\n│           ····    ··                  │\n│        ···    ···                     │\n│     ·C·    ··                         │\n│ · ··    ··                            │\n│ ·    · ·                              │\n│  ·  ·                                 │\nO───────────────────────────────────────O\nLegend: C=cue  1-9=object  H=helper  X=blocker  O=pocket  ·=path"
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
        "x": 49.6,
        "y": 25.5,
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
      "x": 48,
      "y": 18.6
    },
    "object_ball_positions": [
      {
        "ballId": 1,
        "x": 66,
        "y": 18,
        "role": "object"
      },
      {
        "ballId": 8,
        "x": 66,
        "y": 38,
        "role": "prop"
      }
    ],
    "intended_path": [
      {
        "from": {
          "x": 48,
          "y": 18.6
        },
        "to": {
          "x": 66,
          "y": 18
        }
      },
      {
        "from": {
          "x": 66,
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
        "x": 60.7,
        "y": 20.8,
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
    "ascii_table": "O───────────────────────────────────────O\n│                                       │\n│                                       │\n│                                       │\n│                         8             │\n│                                       │\n│                                       │\n│                                       │\n│                                       │\n│                  C ··· ·1·            │\n│                            ···        │\n│                                ··     │\n│                                  ··   │\n│                                     ·O│\nO───────────────────────────────────────O\nLegend: C=cue  1-9=object  H=helper  X=blocker  O=pocket  ·=path"
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
      "x": 69.2,
      "y": 32.6
    },
    "object_ball_positions": [
      {
        "ballId": 1,
        "x": 79.6,
        "y": 38.5,
        "role": "object"
      },
      {
        "ballId": 2,
        "x": 82.4,
        "y": 40,
        "role": "object"
      },
      {
        "ballId": 3,
        "x": 85.2,
        "y": 41.6,
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
          "x": 69.2,
          "y": 32.6
        },
        "to": {
          "x": 79.6,
          "y": 38.5
        }
      },
      {
        "from": {
          "x": 79.6,
          "y": 38.5
        },
        "to": {
          "x": 82.4,
          "y": 40
        }
      },
      {
        "from": {
          "x": 82.4,
          "y": 40
        },
        "to": {
          "x": 85.2,
          "y": 41.6
        }
      },
      {
        "from": {
          "x": 85.2,
          "y": 41.6
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
        "x": 74.4,
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
    "ascii_table": "O───────────────────────────────────────O\n│                                      O│\n│                                   ··  │\n│                               234     │\n│                             ·1·       │\n│                          C ·          │\n│                                       │\n│                                       │\n│                                       │\n│                                       │\n│                                       │\n│                                       │\n│                                       │\n│                                       │\nO───────────────────────────────────────O\nLegend: C=cue  1-9=object  H=helper  X=blocker  O=pocket  ·=path"
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
      "x": 24,
      "y": 26
    },
    "object_ball_positions": [
      {
        "ballId": 1,
        "x": 78,
        "y": 26,
        "role": "object"
      },
      {
        "ballId": 8,
        "x": 50,
        "y": 20.5,
        "role": "blocker"
      },
      {
        "ballId": 7,
        "x": 50,
        "y": 31.5,
        "role": "blocker"
      }
    ],
    "intended_path": [
      {
        "from": {
          "x": 24,
          "y": 26
        },
        "to": {
          "x": 78,
          "y": 26
        }
      },
      {
        "from": {
          "x": 78,
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
        "x": 73.9,
        "y": 21.6,
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
    "ascii_table": "O───────────────────────────────────────O\n│                                      O│\n│                                    ·· │\n│                                   ·   │\n│                                  ·    │\n│                   X            ··     │\n│                               ·       │\n│         C ·· ··· ·· ·· ·· ·· 1        │\n│                   X                   │\n│                                       │\n│                                       │\n│                                       │\n│                                       │\n│                                       │\nO───────────────────────────────────────O\nLegend: C=cue  1-9=object  H=helper  X=blocker  O=pocket  ·=path"
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
        "x": 72,
        "y": 36,
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
          "x": 37.1,
          "y": 0
        }
      },
      {
        "from": {
          "x": 37.1,
          "y": 0
        },
        "to": {
          "x": 100,
          "y": 44.3
        }
      },
      {
        "from": {
          "x": 100,
          "y": 44.3
        },
        "to": {
          "x": 91.9,
          "y": 50
        }
      },
      {
        "from": {
          "x": 91.9,
          "y": 50
        },
        "to": {
          "x": 72,
          "y": 36
        }
      },
      {
        "from": {
          "x": 72,
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
        "x": 84.7,
        "y": 41.9,
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
    "ascii_table": "O───────────────────────────────────────O\n│                                     ·O│\n│                                · ···  │\n│                              ·· · · · │\n│                           1 ··   ·    │\n│                                ··     │\n│                             ··        │\n│                           ··          │\n│                         ·             │\n│                       ··              │\n│        C           · ·                │\n│         ··       ··                   │\n│           · · · ·                     │\n│                                       │\nO───────────────────────────────────────O\nLegend: C=cue  1-9=object  H=helper  X=blocker  O=pocket  ·=path"
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
        "y": 16,
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
          "x": 22,
          "y": 28
        },
        "to": {
          "x": 44,
          "y": 23.4
        },
        "kind": "ground",
        "style": "solid"
      },
      {
        "from": {
          "x": 44,
          "y": 23.4
        },
        "to": {
          "x": 50,
          "y": 33
        },
        "kind": "airborne",
        "style": "dashed"
      },
      {
        "from": {
          "x": 50,
          "y": 33
        },
        "to": {
          "x": 56,
          "y": 21
        },
        "kind": "airborne",
        "style": "dashed"
      },
      {
        "from": {
          "x": 56,
          "y": 21
        },
        "to": {
          "x": 80,
          "y": 16
        },
        "kind": "ground",
        "style": "solid"
      },
      {
        "from": {
          "x": 80,
          "y": 16
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
        "x": 75.3,
        "y": 19.7,
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
    "ascii_table": "O───────────────────────────────────────O\n│                                       │\n│                                       │\n│                                       │\n│                                       │\n│                                       │\n│        C ·       · ·                  │\n│           · ··· ·   ·                 │\n│                   X   ··              │\n│                          ·· ·1        │\n│                                ··     │\n│                                  ·    │\n│                                   · · │\n│                                      O│\nO───────────────────────────────────────O\nLegend: C=cue  1-9=object  H=helper  X=blocker  O=pocket  ·=path"
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
      "x": 26.3,
      "y": 22.9
    },
    "object_ball_positions": [
      {
        "ballId": 1,
        "x": 34,
        "y": 10,
        "role": "object"
      }
    ],
    "intended_path": [
      {
        "from": {
          "x": 26.3,
          "y": 22.9
        },
        "to": {
          "x": 34,
          "y": 10
        }
      },
      {
        "from": {
          "x": 34,
          "y": 10
        },
        "to": {
          "x": 40,
          "y": 0
        }
      },
      {
        "from": {
          "x": 40,
          "y": 0
        },
        "to": {
          "x": 70,
          "y": 50
        }
      },
      {
        "from": {
          "x": 70,
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
        "x": 28.1,
        "y": 10.9,
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
    "ascii_table": "O───────────────────────────────────────O\n│                                       │\n│                          ··           │\n│                        ··  ··         │\n│                        ·     ·        │\n│                       ·      ·        │\n│                      ·        ·       │\n│                     ·          ··     │\n│          C·        ·            ·     │\n│           ·       ·              ·    │\n│            ·     ·                ·   │\n│             1·  ·                  ·  │\n│              · ·                    · │\n│                                      O│\nO───────────────────────────────────────O\nLegend: C=cue  1-9=object  H=helper  X=blocker  O=pocket  ·=path"
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
        "x": 60,
        "y": 32,
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
    "ascii_table": "O───────────────────────────────────────O\n│                                      O│\n│                                   · · │\n│                                 ··    │\n│                              · ·      │\n│                       8    ··         │\n│                         · ·           │\n│                       1·              │\n│                     ··                │\n│                  ··                   │\n│                 C                     │\n│                                       │\n│                                       │\n│                                       │\nO───────────────────────────────────────O\nLegend: C=cue  1-9=object  H=helper  X=blocker  O=pocket  ·=path"
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
      "x": 65.2,
      "y": 43.8
    },
    "object_ball_positions": [
      {
        "ballId": 1,
        "x": 68,
        "y": 26,
        "role": "object"
      }
    ],
    "ghost_ball": {
      "x": 64.6,
      "y": 28.8,
      "show": true
    },
    "contact_point": {
      "x": 67.1,
      "y": 26.8
    },
    "intended_path": [
      {
        "from": {
          "x": 65.2,
          "y": 43.8
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
        "x": 68.9,
        "y": 28.1,
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
    "ascii_table": "O───────────────────────────────────────O\n│                                       │\n│                         C             │\n│                                       │\n│                         ·             │\n│                         ·             │\n│                          ·            │\n│                          1·           │\n│                            ·          │\n│                             · ·       │\n│                                ·      │\n│                                 ··    │\n│                                    ·· │\n│                                      O│\nO───────────────────────────────────────O\nLegend: C=cue  1-9=object  H=helper  X=blocker  O=pocket  ·=path"
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
      "x": 85.2,
      "y": 29.5
    },
    "object_ball_positions": [
      {
        "ballId": 1,
        "x": 84,
        "y": 7.5,
        "role": "object"
      }
    ],
    "ghost_ball": {
      "x": 80,
      "y": 9.4,
      "show": true
    },
    "contact_point": {
      "x": 82.9,
      "y": 8
    },
    "intended_path": [
      {
        "from": {
          "x": 85.2,
          "y": 29.5
        },
        "to": {
          "x": 84,
          "y": 7.5
        }
      },
      {
        "from": {
          "x": 84,
          "y": 7.5
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
        "x": 78.6,
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
    "ascii_table": "O───────────────────────────────────────O\n│                                       │\n│                                       │\n│                                       │\n│                                       │\n│                                       │\n│                                C      │\n│                                ·      │\n│                                ·      │\n│                                ·      │\n│                                ·      │\n│                                1      │\n│                                 · ·   │\n│                                    · O│\nO───────────────────────────────────────O\nLegend: C=cue  1-9=object  H=helper  X=blocker  O=pocket  ·=path"
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
      "y": 14
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
        "y": 22,
        "role": "blocker"
      }
    ],
    "intended_path": [
      {
        "from": {
          "x": 24,
          "y": 14
        },
        "to": {
          "x": 42,
          "y": 21.2
        },
        "kind": "ground",
        "style": "solid"
      },
      {
        "from": {
          "x": 42,
          "y": 21.2
        },
        "to": {
          "x": 48,
          "y": 19
        },
        "kind": "airborne",
        "style": "dashed"
      },
      {
        "from": {
          "x": 48,
          "y": 19
        },
        "to": {
          "x": 54,
          "y": 26
        },
        "kind": "airborne",
        "style": "dashed"
      },
      {
        "from": {
          "x": 54,
          "y": 26
        },
        "to": {
          "x": 74,
          "y": 34
        },
        "kind": "ground",
        "style": "solid"
      },
      {
        "from": {
          "x": 74,
          "y": 34
        },
        "to": {
          "x": 100,
          "y": 50
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
        "y": 50,
        "label": "pocket"
      },
      {
        "x": 87,
        "y": 39.2,
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
    "ascii_table": "O───────────────────────────────────────O\n│                                     ·O│\n│                                  · ·  │\n│                                ··     │\n│                             · ·       │\n│                           ·1          │\n│                      · ··             │\n│                                       │\n│               · ·X·                   │\n│          · ··                         │\n│         C                             │\n│                                       │\n│                                       │\n│                                       │\nO───────────────────────────────────────O\nLegend: C=cue  1-9=object  H=helper  X=blocker  O=pocket  ·=path"
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
      "y": 20
    },
    "object_ball_positions": [
      {
        "ballId": 1,
        "x": 72,
        "y": 4.2,
        "role": "object"
      }
    ],
    "intended_path": [
      {
        "from": {
          "x": 78.4,
          "y": 20
        },
        "to": {
          "x": 72,
          "y": 4.2
        }
      },
      {
        "from": {
          "x": 72,
          "y": 4.2
        },
        "to": {
          "x": 70.3,
          "y": 0
        }
      },
      {
        "from": {
          "x": 70.3,
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
    "ascii_table": "O───────────────────────────────────────O\n│                   O                   │\n│                    ·                  │\n│                    ·                  │\n│                     ·                 │\n│                     ·                 │\n│                      ·                │\n│                       ·               │\n│                        ·     C        │\n│                        ·    ·         │\n│                         ·   ·         │\n│                          · ·          │\n│                          ·1           │\n│                                       │\nO───────────────────────────────────────O\nLegend: C=cue  1-9=object  H=helper  X=blocker  O=pocket  ·=path"
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
      "x": 67.7,
      "y": 11.3
    },
    "object_ball_positions": [
      {
        "ballId": 1,
        "x": 74,
        "y": 26,
        "role": "object"
      },
      {
        "ballId": 8,
        "x": 58,
        "y": 40,
        "role": "prop"
      }
    ],
    "intended_path": [
      {
        "from": {
          "x": 67.7,
          "y": 11.3
        },
        "to": {
          "x": 74,
          "y": 26
        }
      },
      {
        "from": {
          "x": 74,
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
        "x": 69.6,
        "y": 21.9,
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
    "ascii_table": "O───────────────────────────────────────O\n│                                      O│\n│                                    ·· │\n│                      8            ·   │\n│                                 ··    │\n│                              ··       │\n│                             ·         │\n│                            1          │\n│                            ·          │\n│                          ··           │\n│                          C            │\n│                                       │\n│                                       │\n│                                       │\nO───────────────────────────────────────O\nLegend: C=cue  1-9=object  H=helper  X=blocker  O=pocket  ·=path"
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
