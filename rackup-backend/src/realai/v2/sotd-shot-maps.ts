/**
 * Structured Shot-of-the-Day maps for all 52 catalog shots.
 * Coordinates: x 0–100 (head→foot), y 0–50 (bottom→top). Offline-safe catalog fallback.
 * Generated for RealAI V2 SOTD map endpoints; RealAI may enrich but never required.
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
  source: 'catalog_fallback' | 'realai';
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
      "x": 31,
      "y": 25.5
    },
    "object_ball_positions": [
      {
        "ballId": 1,
        "x": 55.6,
        "y": 8.6,
        "role": "object"
      },
      {
        "ballId": 9,
        "x": 70.6,
        "y": 40.6,
        "role": "object"
      }
    ],
    "intended_path": [
      {
        "from": {
          "x": 31,
          "y": 25.5
        },
        "to": {
          "x": 55,
          "y": 8
        }
      },
      {
        "from": {
          "x": 55,
          "y": 8
        },
        "to": {
          "x": 55,
          "y": 0
        }
      },
      {
        "from": {
          "x": 55,
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
        "x": 7.8,
        "y": 3.8,
        "label": "pocket"
      },
      {
        "x": 3.2,
        "y": 1.8,
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
    "source": "catalog_fallback",
    "ascii_table": "O───────────────────O───────────────────O\n│                                      ·│\n│                                       │\n│                           9        ·  │\n│                                  ·    │\n│                                       │\n│                                ·      │\n│            C·               ·         │\n│              ··                       │\n│                ·          ·           │\n│                 · ·     ·             │\n│                    ·1                 │\n│                     · ·               │\n│                     ·                 │\nO───────────────────O───────────────────O\nLegend: C=cue  1-9=object  X=blocker  O=pocket  ·=path"
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
      "x": 35,
      "y": 25
    },
    "object_ball_positions": [
      {
        "ballId": 1,
        "x": 57.2,
        "y": 25.4,
        "role": "object"
      }
    ],
    "intended_path": [
      {
        "from": {
          "x": 35,
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
          "x": 100,
          "y": 30
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
        "x": 8,
        "y": 2,
        "label": "pocket"
      },
      {
        "x": 4.3,
        "y": 2,
        "label": "cb_rest"
      }
    ],
    "pocket_target": {
      "x": 100,
      "y": 30
    },
    "coordinate_system": {
      "x": "0=head rail → 100=foot rail",
      "y": "0=bottom long rail → 50=top long rail",
      "units": "normalized table percent (9-foot aspect 2:1)"
    },
    "source": "catalog_fallback",
    "ascii_table": "O───────────────────O───────────────────O\n│                                       │\n│                                       │\n│                                       │\n│                                       │\n│                                       │\n│                              · · · · ·│\n│             C········1· ·  ·          │\n│                                       │\n│                                       │\n│                                       │\n│                                       │\n│                                       │\n│                                       │\nO───────────────────O───────────────────O\nLegend: C=cue  1-9=object  X=blocker  O=pocket  ·=path"
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
      "x": 36,
      "y": 25.5
    },
    "object_ball_positions": [
      {
        "ballId": 1,
        "x": 57.3,
        "y": 25.2,
        "role": "object"
      }
    ],
    "intended_path": [
      {
        "from": {
          "x": 36,
          "y": 25.5
        },
        "to": {
          "x": 57,
          "y": 25
        }
      },
      {
        "from": {
          "x": 57,
          "y": 25
        },
        "to": {
          "x": 100,
          "y": 20
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
        "x": 8,
        "y": 2,
        "label": "pocket"
      },
      {
        "x": 4.3,
        "y": 2,
        "label": "cb_rest"
      }
    ],
    "pocket_target": {
      "x": 100,
      "y": 20
    },
    "coordinate_system": {
      "x": "0=head rail → 100=foot rail",
      "y": "0=bottom long rail → 50=top long rail",
      "units": "normalized table percent (9-foot aspect 2:1)"
    },
    "source": "catalog_fallback",
    "ascii_table": "O───────────────────O───────────────────O\n│                                       │\n│                                       │\n│                                       │\n│                                       │\n│                                       │\n│                                       │\n│              C·······1 · · ·          │\n│                              · · · · ·│\n│                                       │\n│                                       │\n│                                       │\n│                                       │\n│                                       │\nO───────────────────O───────────────────O\nLegend: C=cue  1-9=object  X=blocker  O=pocket  ·=path"
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
      "x": 40,
      "y": 25
    },
    "object_ball_positions": [
      {
        "ballId": 1,
        "x": 58.9,
        "y": 25,
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
          "x": 58,
          "y": 25
        }
      },
      {
        "from": {
          "x": 58,
          "y": 25
        },
        "to": {
          "x": 100,
          "y": 30
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
        "x": 8,
        "y": 2,
        "label": "pocket"
      },
      {
        "x": 4.3,
        "y": 2,
        "label": "cb_rest"
      }
    ],
    "pocket_target": {
      "x": 100,
      "y": 30
    },
    "coordinate_system": {
      "x": "0=head rail → 100=foot rail",
      "y": "0=bottom long rail → 50=top long rail",
      "units": "normalized table percent (9-foot aspect 2:1)"
    },
    "source": "catalog_fallback",
    "ascii_table": "O───────────────────O───────────────────O\n│                                       │\n│                                       │\n│                                       │\n│                                       │\n│                                       │\n│                              · · · · ·│\n│               C······1 · · ·          │\n│                                       │\n│                                       │\n│                                       │\n│                                       │\n│                                       │\n│                                       │\nO───────────────────O───────────────────O\nLegend: C=cue  1-9=object  X=blocker  O=pocket  ·=path"
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
      "x": 27,
      "y": 23.5
    },
    "object_ball_positions": [
      {
        "ballId": 1,
        "x": 60,
        "y": 30.6,
        "role": "object"
      },
      {
        "ballId": 8,
        "x": 45,
        "y": 22.6,
        "role": "blocker"
      }
    ],
    "intended_path": [
      {
        "from": {
          "x": 27,
          "y": 23.5
        },
        "to": {
          "x": 40,
          "y": 28
        }
      },
      {
        "from": {
          "x": 40,
          "y": 28
        },
        "to": {
          "x": 55,
          "y": 35
        }
      },
      {
        "from": {
          "x": 55,
          "y": 35
        },
        "to": {
          "x": 60,
          "y": 30
        }
      },
      {
        "from": {
          "x": 60,
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
        "x": 8,
        "y": 4,
        "label": "pocket"
      },
      {
        "x": 5,
        "y": 2.2,
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
    "source": "catalog_fallback",
    "ascii_table": "O───────────────────O───────────────────O\n│                                      ·│\n│                                  · ·  │\n│                              · ·      │\n│                             ·         │\n│                  ·····  · ·           │\n│               ···    ·1               │\n│          C····                        │\n│                 X                     │\n│                                       │\n│                                       │\n│                                       │\n│                                       │\n│                                       │\nO───────────────────O───────────────────O\nLegend: C=cue  1-9=object  X=blocker  O=pocket  ·=path"
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
      "x": 30,
      "y": 25
    },
    "object_ball_positions": [
      {
        "ballId": 1,
        "x": 55.6,
        "y": 25.4,
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
          "x": 55,
          "y": 25
        }
      },
      {
        "from": {
          "x": 55,
          "y": 25
        },
        "to": {
          "x": 100,
          "y": 20
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
        "x": 8,
        "y": 2,
        "label": "pocket"
      },
      {
        "x": 4.3,
        "y": 2,
        "label": "cb_rest"
      }
    ],
    "pocket_target": {
      "x": 100,
      "y": 20
    },
    "coordinate_system": {
      "x": "0=head rail → 100=foot rail",
      "y": "0=bottom long rail → 50=top long rail",
      "units": "normalized table percent (9-foot aspect 2:1)"
    },
    "source": "catalog_fallback",
    "ascii_table": "O───────────────────O───────────────────O\n│                                       │\n│                                       │\n│                                       │\n│                                       │\n│                                       │\n│                                       │\n│           C ····· ··1 · · ·           │\n│                             ·  · · · ·│\n│                                       │\n│                                       │\n│                                       │\n│                                       │\n│                                       │\nO───────────────────O───────────────────O\nLegend: C=cue  1-9=object  X=blocker  O=pocket  ·=path"
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
      "x": 17,
      "y": 10.5
    },
    "object_ball_positions": [
      {
        "ballId": 1,
        "x": 76.2,
        "y": 40.2,
        "role": "object"
      }
    ],
    "intended_path": [
      {
        "from": {
          "x": 17,
          "y": 10.5
        },
        "to": {
          "x": 50,
          "y": 0
        }
      },
      {
        "from": {
          "x": 50,
          "y": 0
        },
        "to": {
          "x": 85,
          "y": 50
        }
      },
      {
        "from": {
          "x": 85,
          "y": 50
        },
        "to": {
          "x": 75,
          "y": 40
        }
      },
      {
        "from": {
          "x": 75,
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
        "x": 8,
        "y": 4,
        "label": "pocket"
      },
      {
        "x": 5.8,
        "y": 3,
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
    "source": "catalog_fallback",
    "ascii_table": "O───────────────────O───────────────────O\n│                                ·    ··│\n│                              ·· ·· ·  │\n│                             1···      │\n│                             ·         │\n│                                       │\n│                           ·           │\n│                          ·            │\n│                                       │\n│                        ·              │\n│      C               ·                │\n│        · ··                           │\n│             ·· ·    ·                 │\n│                 · ·                   │\nO───────────────────O───────────────────O\nLegend: C=cue  1-9=object  X=blocker  O=pocket  ·=path"
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
      "x": 22,
      "y": 27
    },
    "object_ball_positions": [
      {
        "ballId": 1,
        "x": 45.3,
        "y": 25,
        "role": "object"
      },
      {
        "ballId": 2,
        "x": 58.3,
        "y": 25,
        "role": "object"
      }
    ],
    "intended_path": [
      {
        "from": {
          "x": 22,
          "y": 27
        },
        "to": {
          "x": 45,
          "y": 25
        }
      },
      {
        "from": {
          "x": 45,
          "y": 25
        },
        "to": {
          "x": 58,
          "y": 25
        }
      },
      {
        "from": {
          "x": 58,
          "y": 25
        },
        "to": {
          "x": 100,
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
        "x": 8,
        "y": 2,
        "label": "pocket"
      },
      {
        "x": 3.4,
        "y": 2,
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
    "source": "catalog_fallback",
    "ascii_table": "O───────────────────O───────────────────O\n│                                       │\n│                                       │\n│                                       │\n│                                       │\n│                                       │\n│                                       │\n│        C· ······1····2 · · · · · · · ·│\n│                                       │\n│                                       │\n│                                       │\n│                                       │\n│                                       │\n│                                       │\nO───────────────────O───────────────────O\nLegend: C=cue  1-9=object  X=blocker  O=pocket  ·=path"
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
      "x": 25,
      "y": 23.5
    },
    "object_ball_positions": [
      {
        "ballId": 1,
        "x": 50.9,
        "y": 25.6,
        "role": "object"
      },
      {
        "ballId": 9,
        "x": 62.9,
        "y": 30.6,
        "role": "object"
      }
    ],
    "intended_path": [
      {
        "from": {
          "x": 25,
          "y": 23.5
        },
        "to": {
          "x": 50,
          "y": 25
        }
      },
      {
        "from": {
          "x": 50,
          "y": 25
        },
        "to": {
          "x": 62,
          "y": 30
        }
      },
      {
        "from": {
          "x": 62,
          "y": 30
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
        "x": 8,
        "y": 0,
        "label": "pocket"
      },
      {
        "x": 4.4,
        "y": 2.2,
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
    "source": "catalog_fallback",
    "ascii_table": "O───────────────────O───────────────────O\n│                                       │\n│                                       │\n│                                       │\n│                                       │\n│                                       │\n│                     ···9              │\n│          C····· ··1··   ·             │\n│                           ·           │\n│                             · ·       │\n│                                 ·     │\n│                                  ·    │\n│                                    ·  │\n│                                      ·│\nO───────────────────O───────────────────O\nLegend: C=cue  1-9=object  X=blocker  O=pocket  ·=path"
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
      "x": 43,
      "y": 25
    },
    "object_ball_positions": [
      {
        "ballId": 1,
        "x": 59,
        "y": 25.4,
        "role": "object"
      }
    ],
    "intended_path": [
      {
        "from": {
          "x": 43,
          "y": 25
        },
        "to": {
          "x": 59,
          "y": 25
        }
      },
      {
        "from": {
          "x": 59,
          "y": 25
        },
        "to": {
          "x": 100,
          "y": 20
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
        "x": 8,
        "y": 2,
        "label": "pocket"
      },
      {
        "x": 4.3,
        "y": 2,
        "label": "cb_rest"
      }
    ],
    "pocket_target": {
      "x": 100,
      "y": 20
    },
    "coordinate_system": {
      "x": "0=head rail → 100=foot rail",
      "y": "0=bottom long rail → 50=top long rail",
      "units": "normalized table percent (9-foot aspect 2:1)"
    },
    "source": "catalog_fallback",
    "ascii_table": "O───────────────────O───────────────────O\n│                                       │\n│                                       │\n│                                       │\n│                                       │\n│                                       │\n│                                       │\n│                C·····1 · · ·          │\n│                              · · · · ·│\n│                                       │\n│                                       │\n│                                       │\n│                                       │\n│                                       │\nO───────────────────O───────────────────O\nLegend: C=cue  1-9=object  X=blocker  O=pocket  ·=path"
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
      "x": 32,
      "y": 25.5
    },
    "object_ball_positions": [
      {
        "ballId": 1,
        "x": 55.6,
        "y": 25.2,
        "role": "object"
      }
    ],
    "intended_path": [
      {
        "from": {
          "x": 32,
          "y": 25.5
        },
        "to": {
          "x": 55,
          "y": 25
        }
      },
      {
        "from": {
          "x": 55,
          "y": 25
        },
        "to": {
          "x": 100,
          "y": 20
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
        "x": 8,
        "y": 2,
        "label": "pocket"
      },
      {
        "x": 4.3,
        "y": 2,
        "label": "cb_rest"
      }
    ],
    "pocket_target": {
      "x": 100,
      "y": 20
    },
    "coordinate_system": {
      "x": "0=head rail → 100=foot rail",
      "y": "0=bottom long rail → 50=top long rail",
      "units": "normalized table percent (9-foot aspect 2:1)"
    },
    "source": "catalog_fallback",
    "ascii_table": "O───────────────────O───────────────────O\n│                                       │\n│                                       │\n│                                       │\n│                                       │\n│                                       │\n│                                       │\n│            C··· ····1 · · ·           │\n│                             ·  · · · ·│\n│                                       │\n│                                       │\n│                                       │\n│                                       │\n│                                       │\nO───────────────────O───────────────────O\nLegend: C=cue  1-9=object  X=blocker  O=pocket  ·=path"
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
      "x": 33,
      "y": 25
    },
    "object_ball_positions": [
      {
        "ballId": 1,
        "x": 57.2,
        "y": 25,
        "role": "object"
      }
    ],
    "intended_path": [
      {
        "from": {
          "x": 33,
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
          "x": 100,
          "y": 30
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
        "x": 8,
        "y": 2,
        "label": "pocket"
      },
      {
        "x": 4.3,
        "y": 2,
        "label": "cb_rest"
      }
    ],
    "pocket_target": {
      "x": 100,
      "y": 30
    },
    "coordinate_system": {
      "x": "0=head rail → 100=foot rail",
      "y": "0=bottom long rail → 50=top long rail",
      "units": "normalized table percent (9-foot aspect 2:1)"
    },
    "source": "catalog_fallback",
    "ascii_table": "O───────────────────O───────────────────O\n│                                       │\n│                                       │\n│                                       │\n│                                       │\n│                                       │\n│                              · · · · ·│\n│             C········1· ·  ·          │\n│                                       │\n│                                       │\n│                                       │\n│                                       │\n│                                       │\n│                                       │\nO───────────────────O───────────────────O\nLegend: C=cue  1-9=object  X=blocker  O=pocket  ·=path"
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
      "x": 35,
      "y": 25.5
    },
    "object_ball_positions": [
      {
        "ballId": 1,
        "x": 55.3,
        "y": 10.6,
        "role": "object"
      },
      {
        "ballId": 9,
        "x": 70.3,
        "y": 38.6,
        "role": "object"
      }
    ],
    "intended_path": [
      {
        "from": {
          "x": 35,
          "y": 25.5
        },
        "to": {
          "x": 55,
          "y": 10
        }
      },
      {
        "from": {
          "x": 55,
          "y": 10
        },
        "to": {
          "x": 55,
          "y": 0
        }
      },
      {
        "from": {
          "x": 55,
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
        "x": 7.8,
        "y": 3.8,
        "label": "pocket"
      },
      {
        "x": 3.2,
        "y": 1.8,
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
    "source": "catalog_fallback",
    "ascii_table": "O───────────────────O───────────────────O\n│                                      ·│\n│                                       │\n│                                    ·  │\n│                           9      ·    │\n│                                       │\n│                                ·      │\n│             C·              ·         │\n│               ··                      │\n│                 ··        ·           │\n│                   ··1   ·             │\n│                     ·                 │\n│                     · ·               │\n│                     ·                 │\nO───────────────────O───────────────────O\nLegend: C=cue  1-9=object  X=blocker  O=pocket  ·=path"
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
      "x": 27,
      "y": 21
    },
    "object_ball_positions": [
      {
        "ballId": 1,
        "x": 60.9,
        "y": 30.4,
        "role": "object"
      },
      {
        "ballId": 8,
        "x": 45.9,
        "y": 22.4,
        "role": "blocker"
      }
    ],
    "intended_path": [
      {
        "from": {
          "x": 27,
          "y": 21
        },
        "to": {
          "x": 40,
          "y": 28
        }
      },
      {
        "from": {
          "x": 40,
          "y": 28
        },
        "to": {
          "x": 55,
          "y": 35
        }
      },
      {
        "from": {
          "x": 55,
          "y": 35
        },
        "to": {
          "x": 60,
          "y": 30
        }
      },
      {
        "from": {
          "x": 60,
          "y": 30
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
        "x": 8,
        "y": 4,
        "label": "pocket"
      },
      {
        "x": 5,
        "y": 2.2,
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
    "source": "catalog_fallback",
    "ascii_table": "O───────────────────O───────────────────O\n│                                      ·│\n│                                  · ·  │\n│                              · ·      │\n│                             ·         │\n│                  ·····  · ·           │\n│               ···    ·1               │\n│            ···                        │\n│          C·     X                     │\n│                                       │\n│                                       │\n│                                       │\n│                                       │\n│                                       │\nO───────────────────O───────────────────O\nLegend: C=cue  1-9=object  X=blocker  O=pocket  ·=path"
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
          "x": 45,
          "y": 32
        }
      },
      {
        "from": {
          "x": 45,
          "y": 32
        },
        "to": {
          "x": 70,
          "y": 25
        }
      },
      {
        "from": {
          "x": 70,
          "y": 25
        },
        "to": {
          "x": 100,
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
        "x": 8,
        "y": 2,
        "label": "pocket"
      },
      {
        "x": 5.4,
        "y": 2,
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
    "source": "catalog_fallback",
    "ascii_table": "O───────────────────O───────────────────O\n│                                       │\n│                                       │\n│                                       │\n│                                       │\n│                 ·                     │\n│           ······ ·· ···               │\n│         C·      X      ·· 1·· ·· ·· ··│\n│                                       │\n│                                       │\n│                                       │\n│                                       │\n│                                       │\n│                                       │\nO───────────────────O───────────────────O\nLegend: C=cue  1-9=object  X=blocker  O=pocket  ·=path"
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
      "x": 36,
      "y": 20
    },
    "object_ball_positions": [
      {
        "ballId": 1,
        "x": 55.6,
        "y": 35,
        "role": "object"
      },
      {
        "ballId": 5,
        "x": 48.6,
        "y": 28,
        "role": "blocker"
      }
    ],
    "intended_path": [
      {
        "from": {
          "x": 36,
          "y": 20
        },
        "to": {
          "x": 42,
          "y": 30
        }
      },
      {
        "from": {
          "x": 42,
          "y": 30
        },
        "to": {
          "x": 50,
          "y": 38
        }
      },
      {
        "from": {
          "x": 50,
          "y": 38
        },
        "to": {
          "x": 55,
          "y": 35
        }
      },
      {
        "from": {
          "x": 55,
          "y": 35
        },
        "to": {
          "x": 80,
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
        "x": 6.4,
        "y": 0,
        "label": "pocket"
      },
      {
        "x": 4.2,
        "y": 2.6,
        "label": "cb_rest"
      }
    ],
    "pocket_target": {
      "x": 80,
      "y": 0
    },
    "coordinate_system": {
      "x": "0=head rail → 100=foot rail",
      "y": "0=bottom long rail → 50=top long rail",
      "units": "normalized table percent (9-foot aspect 2:1)"
    },
    "source": "catalog_fallback",
    "ascii_table": "O───────────────────O───────────────────O\n│                                       │\n│                                       │\n│                                       │\n│                  ···                  │\n│                 ··  1                 │\n│               ·· X   ·                │\n│               ·       ·               │\n│              C         ·              │\n│                          ·            │\n│                           ·           │\n│                            ·          │\n│                             ·         │\n│                              ·        │\nO───────────────────O───────────────────O\nLegend: C=cue  1-9=object  X=blocker  O=pocket  ·=path"
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
      "y": 10.5
    },
    "object_ball_positions": [
      {
        "ballId": 1,
        "x": 76.2,
        "y": 40.6,
        "role": "object"
      }
    ],
    "intended_path": [
      {
        "from": {
          "x": 18,
          "y": 10.5
        },
        "to": {
          "x": 50,
          "y": 0
        }
      },
      {
        "from": {
          "x": 50,
          "y": 0
        },
        "to": {
          "x": 85,
          "y": 50
        }
      },
      {
        "from": {
          "x": 85,
          "y": 50
        },
        "to": {
          "x": 75,
          "y": 40
        }
      },
      {
        "from": {
          "x": 75,
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
        "x": 8,
        "y": 4,
        "label": "pocket"
      },
      {
        "x": 5.8,
        "y": 3,
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
    "source": "catalog_fallback",
    "ascii_table": "O───────────────────O───────────────────O\n│                                ·    ··│\n│                              ·· ·· ·  │\n│                             1···      │\n│                             ·         │\n│                                       │\n│                           ·           │\n│                          ·            │\n│                                       │\n│                        ·              │\n│       C              ·                │\n│        · ··                           │\n│             ·· ·    ·                 │\n│                 · ·                   │\nO───────────────────O───────────────────O\nLegend: C=cue  1-9=object  X=blocker  O=pocket  ·=path"
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
      "x": 20,
      "y": 27
    },
    "object_ball_positions": [
      {
        "ballId": 1,
        "x": 45.3,
        "y": 25.4,
        "role": "object"
      },
      {
        "ballId": 2,
        "x": 58.3,
        "y": 25.4,
        "role": "object"
      }
    ],
    "intended_path": [
      {
        "from": {
          "x": 20,
          "y": 27
        },
        "to": {
          "x": 45,
          "y": 25
        }
      },
      {
        "from": {
          "x": 45,
          "y": 25
        },
        "to": {
          "x": 58,
          "y": 25
        }
      },
      {
        "from": {
          "x": 58,
          "y": 25
        },
        "to": {
          "x": 100,
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
        "x": 8,
        "y": 2,
        "label": "pocket"
      },
      {
        "x": 3.4,
        "y": 2,
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
    "source": "catalog_fallback",
    "ascii_table": "O───────────────────O───────────────────O\n│                                       │\n│                                       │\n│                                       │\n│                                       │\n│                                       │\n│                                       │\n│        C···· ···1····2 · · · · · · · ·│\n│                                       │\n│                                       │\n│                                       │\n│                                       │\n│                                       │\n│                                       │\nO───────────────────O───────────────────O\nLegend: C=cue  1-9=object  X=blocker  O=pocket  ·=path"
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
      "x": 37,
      "y": 25.5
    },
    "object_ball_positions": [
      {
        "ballId": 1,
        "x": 55.9,
        "y": 11.2,
        "role": "object"
      },
      {
        "ballId": 9,
        "x": 70.9,
        "y": 37.2,
        "role": "object"
      }
    ],
    "intended_path": [
      {
        "from": {
          "x": 37,
          "y": 25.5
        },
        "to": {
          "x": 55,
          "y": 11
        }
      },
      {
        "from": {
          "x": 55,
          "y": 11
        },
        "to": {
          "x": 55,
          "y": 0
        }
      },
      {
        "from": {
          "x": 55,
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
        "x": 7.8,
        "y": 3.8,
        "label": "pocket"
      },
      {
        "x": 3.2,
        "y": 1.8,
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
    "source": "catalog_fallback",
    "ascii_table": "O───────────────────O───────────────────O\n│                                      ·│\n│                                       │\n│                                    ·  │\n│                           9      ·    │\n│                                       │\n│                                ·      │\n│              C·             ·         │\n│                ··                     │\n│                 ···       ·           │\n│                    ·1   ·             │\n│                     ·                 │\n│                     · ·               │\n│                     ·                 │\nO───────────────────O───────────────────O\nLegend: C=cue  1-9=object  X=blocker  O=pocket  ·=path"
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
      "x": 44,
      "y": 25
    },
    "object_ball_positions": [
      {
        "ballId": 1,
        "x": 59,
        "y": 25,
        "role": "object"
      }
    ],
    "intended_path": [
      {
        "from": {
          "x": 44,
          "y": 25
        },
        "to": {
          "x": 59,
          "y": 25
        }
      },
      {
        "from": {
          "x": 59,
          "y": 25
        },
        "to": {
          "x": 100,
          "y": 20
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
        "x": 8,
        "y": 2,
        "label": "pocket"
      },
      {
        "x": 4.3,
        "y": 2,
        "label": "cb_rest"
      }
    ],
    "pocket_target": {
      "x": 100,
      "y": 20
    },
    "coordinate_system": {
      "x": "0=head rail → 100=foot rail",
      "y": "0=bottom long rail → 50=top long rail",
      "units": "normalized table percent (9-foot aspect 2:1)"
    },
    "source": "catalog_fallback",
    "ascii_table": "O───────────────────O───────────────────O\n│                                       │\n│                                       │\n│                                       │\n│                                       │\n│                                       │\n│                                       │\n│                 C····1 · · ·          │\n│                              · · · · ·│\n│                                       │\n│                                       │\n│                                       │\n│                                       │\n│                                       │\nO───────────────────O───────────────────O\nLegend: C=cue  1-9=object  X=blocker  O=pocket  ·=path"
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
      "x": 30,
      "y": 25.5
    },
    "object_ball_positions": [
      {
        "ballId": 1,
        "x": 55.6,
        "y": 8.6,
        "role": "object"
      },
      {
        "ballId": 9,
        "x": 70.6,
        "y": 40.6,
        "role": "object"
      }
    ],
    "intended_path": [
      {
        "from": {
          "x": 30,
          "y": 25.5
        },
        "to": {
          "x": 55,
          "y": 8
        }
      },
      {
        "from": {
          "x": 55,
          "y": 8
        },
        "to": {
          "x": 55,
          "y": 0
        }
      },
      {
        "from": {
          "x": 55,
          "y": 0
        },
        "to": {
          "x": 100,
          "y": 50
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
        "x": 7.8,
        "y": 3.8,
        "label": "pocket"
      },
      {
        "x": 3.2,
        "y": 1.8,
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
    "source": "catalog_fallback",
    "ascii_table": "O───────────────────O───────────────────O\n│                                      ·│\n│                                       │\n│                           9        ·  │\n│                                  ·    │\n│                                       │\n│                                ·      │\n│           C ·               ·         │\n│              ··                       │\n│                ·          ·           │\n│                 · ·     ·             │\n│                    ·1                 │\n│                     · ·               │\n│                     ·                 │\nO───────────────────O───────────────────O\nLegend: C=cue  1-9=object  X=blocker  O=pocket  ·=path"
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
      "x": 17,
      "y": 10
    },
    "object_ball_positions": [
      {
        "ballId": 1,
        "x": 76.2,
        "y": 40.4,
        "role": "object"
      }
    ],
    "intended_path": [
      {
        "from": {
          "x": 17,
          "y": 10
        },
        "to": {
          "x": 50,
          "y": 0
        }
      },
      {
        "from": {
          "x": 50,
          "y": 0
        },
        "to": {
          "x": 85,
          "y": 50
        }
      },
      {
        "from": {
          "x": 85,
          "y": 50
        },
        "to": {
          "x": 75,
          "y": 40
        }
      },
      {
        "from": {
          "x": 75,
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
        "x": 8,
        "y": 4,
        "label": "pocket"
      },
      {
        "x": 5.8,
        "y": 3,
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
    "source": "catalog_fallback",
    "ascii_table": "O───────────────────O───────────────────O\n│                                ·    ··│\n│                              ·· ·· ·  │\n│                             1···      │\n│                             ·         │\n│                                       │\n│                           ·           │\n│                          ·            │\n│                                       │\n│                        ·              │\n│                      ·                │\n│      C · ·                            │\n│           · ·· ·    ·                 │\n│                 · ·                   │\nO───────────────────O───────────────────O\nLegend: C=cue  1-9=object  X=blocker  O=pocket  ·=path"
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
      "x": 38,
      "y": 25.5
    },
    "object_ball_positions": [
      {
        "ballId": 1,
        "x": 57.3,
        "y": 25.2,
        "role": "object"
      }
    ],
    "intended_path": [
      {
        "from": {
          "x": 38,
          "y": 25.5
        },
        "to": {
          "x": 57,
          "y": 25
        }
      },
      {
        "from": {
          "x": 57,
          "y": 25
        },
        "to": {
          "x": 100,
          "y": 20
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
        "x": 8,
        "y": 2,
        "label": "pocket"
      },
      {
        "x": 4.3,
        "y": 2,
        "label": "cb_rest"
      }
    ],
    "pocket_target": {
      "x": 100,
      "y": 20
    },
    "coordinate_system": {
      "x": "0=head rail → 100=foot rail",
      "y": "0=bottom long rail → 50=top long rail",
      "units": "normalized table percent (9-foot aspect 2:1)"
    },
    "source": "catalog_fallback",
    "ascii_table": "O───────────────────O───────────────────O\n│                                       │\n│                                       │\n│                                       │\n│                                       │\n│                                       │\n│                                       │\n│              C·······1 · · ·          │\n│                              · · · · ·│\n│                                       │\n│                                       │\n│                                       │\n│                                       │\n│                                       │\nO───────────────────O───────────────────O\nLegend: C=cue  1-9=object  X=blocker  O=pocket  ·=path"
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
      "x": 18,
      "y": 25
    },
    "object_ball_positions": [
      {
        "ballId": 1,
        "x": 56.9,
        "y": 25,
        "role": "object"
      },
      {
        "ballId": 8,
        "x": 65.9,
        "y": 21,
        "role": "object"
      }
    ],
    "intended_path": [
      {
        "from": {
          "x": 18,
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
        "x": 8,
        "y": 4,
        "label": "pocket"
      },
      {
        "x": 3.8,
        "y": 2,
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
    "source": "catalog_fallback",
    "ascii_table": "O───────────────────O───────────────────O\n│                                      ·│\n│                                    ·  │\n│                                · ·    │\n│                              ·        │\n│                            ·          │\n│                       · ·             │\n│       C ·· · · · ·· ·1                │\n│                         8             │\n│                                       │\n│                                       │\n│                                       │\n│                                       │\n│                                       │\nO───────────────────O───────────────────O\nLegend: C=cue  1-9=object  X=blocker  O=pocket  ·=path"
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
      "x": 26,
      "y": 24.5
    },
    "object_ball_positions": [
      {
        "ballId": 1,
        "x": 50,
        "y": 25.6,
        "role": "object"
      },
      {
        "ballId": 9,
        "x": 62,
        "y": 30.6,
        "role": "object"
      }
    ],
    "intended_path": [
      {
        "from": {
          "x": 26,
          "y": 24.5
        },
        "to": {
          "x": 50,
          "y": 25
        }
      },
      {
        "from": {
          "x": 50,
          "y": 25
        },
        "to": {
          "x": 62,
          "y": 30
        }
      },
      {
        "from": {
          "x": 62,
          "y": 30
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
        "x": 8,
        "y": 0,
        "label": "pocket"
      },
      {
        "x": 4.4,
        "y": 2.2,
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
    "source": "catalog_fallback",
    "ascii_table": "O───────────────────O───────────────────O\n│                                       │\n│                                       │\n│                                       │\n│                                       │\n│                                       │\n│                     ···9              │\n│          C···· ···1··   ·             │\n│                           ·           │\n│                             · ·       │\n│                                 ·     │\n│                                  ·    │\n│                                    ·  │\n│                                      ·│\nO───────────────────O───────────────────O\nLegend: C=cue  1-9=object  X=blocker  O=pocket  ·=path"
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
      "x": 32,
      "y": 25
    },
    "object_ball_positions": [
      {
        "ballId": 1,
        "x": 55.6,
        "y": 25.4,
        "role": "object"
      }
    ],
    "intended_path": [
      {
        "from": {
          "x": 32,
          "y": 25
        },
        "to": {
          "x": 55,
          "y": 25
        }
      },
      {
        "from": {
          "x": 55,
          "y": 25
        },
        "to": {
          "x": 100,
          "y": 20
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
        "x": 8,
        "y": 2,
        "label": "pocket"
      },
      {
        "x": 4.3,
        "y": 2,
        "label": "cb_rest"
      }
    ],
    "pocket_target": {
      "x": 100,
      "y": 20
    },
    "coordinate_system": {
      "x": "0=head rail → 100=foot rail",
      "y": "0=bottom long rail → 50=top long rail",
      "units": "normalized table percent (9-foot aspect 2:1)"
    },
    "source": "catalog_fallback",
    "ascii_table": "O───────────────────O───────────────────O\n│                                       │\n│                                       │\n│                                       │\n│                                       │\n│                                       │\n│                                       │\n│            C··· ····1 · · ·           │\n│                             ·  · · · ·│\n│                                       │\n│                                       │\n│                                       │\n│                                       │\n│                                       │\nO───────────────────O───────────────────O\nLegend: C=cue  1-9=object  X=blocker  O=pocket  ·=path"
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
      "x": 32,
      "y": 25.5
    },
    "object_ball_positions": [
      {
        "ballId": 1,
        "x": 56.2,
        "y": 9.2,
        "role": "object"
      },
      {
        "ballId": 9,
        "x": 71.2,
        "y": 39.2,
        "role": "object"
      }
    ],
    "intended_path": [
      {
        "from": {
          "x": 32,
          "y": 25.5
        },
        "to": {
          "x": 55,
          "y": 9
        }
      },
      {
        "from": {
          "x": 55,
          "y": 9
        },
        "to": {
          "x": 55,
          "y": 0
        }
      },
      {
        "from": {
          "x": 55,
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
        "x": 7.8,
        "y": 3.8,
        "label": "pocket"
      },
      {
        "x": 3.2,
        "y": 1.8,
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
    "source": "catalog_fallback",
    "ascii_table": "O───────────────────O───────────────────O\n│                                      ·│\n│                                       │\n│                                    ·  │\n│                           9      ·    │\n│                                       │\n│                                ·      │\n│            C·               ·         │\n│              ··                       │\n│                 ··        ·           │\n│                   ··    ·             │\n│                     1                 │\n│                     · ·               │\n│                     ·                 │\nO───────────────────O───────────────────O\nLegend: C=cue  1-9=object  X=blocker  O=pocket  ·=path"
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
      "x": 18,
      "y": 10
    },
    "object_ball_positions": [
      {
        "ballId": 1,
        "x": 75.3,
        "y": 40,
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
          "x": 50,
          "y": 0
        }
      },
      {
        "from": {
          "x": 50,
          "y": 0
        },
        "to": {
          "x": 85,
          "y": 50
        }
      },
      {
        "from": {
          "x": 85,
          "y": 50
        },
        "to": {
          "x": 75,
          "y": 40
        }
      },
      {
        "from": {
          "x": 75,
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
        "x": 8,
        "y": 4,
        "label": "pocket"
      },
      {
        "x": 5.8,
        "y": 3,
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
    "source": "catalog_fallback",
    "ascii_table": "O───────────────────O───────────────────O\n│                                ·    ··│\n│                              ·· ·· ·  │\n│                             1···      │\n│                             ·         │\n│                                       │\n│                           ·           │\n│                          ·            │\n│                                       │\n│                        ·              │\n│                      ·                │\n│       C· ·                            │\n│           · ·· ·    ·                 │\n│                 · ·                   │\nO───────────────────O───────────────────O\nLegend: C=cue  1-9=object  X=blocker  O=pocket  ·=path"
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
      "x": 41,
      "y": 25.5
    },
    "object_ball_positions": [
      {
        "ballId": 1,
        "x": 58.9,
        "y": 25.6,
        "role": "object"
      }
    ],
    "intended_path": [
      {
        "from": {
          "x": 41,
          "y": 25.5
        },
        "to": {
          "x": 58,
          "y": 25
        }
      },
      {
        "from": {
          "x": 58,
          "y": 25
        },
        "to": {
          "x": 100,
          "y": 30
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
        "x": 8,
        "y": 2,
        "label": "pocket"
      },
      {
        "x": 4.3,
        "y": 2,
        "label": "cb_rest"
      }
    ],
    "pocket_target": {
      "x": 100,
      "y": 30
    },
    "coordinate_system": {
      "x": "0=head rail → 100=foot rail",
      "y": "0=bottom long rail → 50=top long rail",
      "units": "normalized table percent (9-foot aspect 2:1)"
    },
    "source": "catalog_fallback",
    "ascii_table": "O───────────────────O───────────────────O\n│                                       │\n│                                       │\n│                                       │\n│                                       │\n│                                       │\n│                              · · · · ·│\n│                C·····1 · · ·          │\n│                                       │\n│                                       │\n│                                       │\n│                                       │\n│                                       │\n│                                       │\nO───────────────────O───────────────────O\nLegend: C=cue  1-9=object  X=blocker  O=pocket  ·=path"
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
      "x": 25,
      "y": 23
    },
    "object_ball_positions": [
      {
        "ballId": 1,
        "x": 60,
        "y": 30.4,
        "role": "object"
      },
      {
        "ballId": 8,
        "x": 45,
        "y": 22.4,
        "role": "blocker"
      }
    ],
    "intended_path": [
      {
        "from": {
          "x": 25,
          "y": 23
        },
        "to": {
          "x": 40,
          "y": 28
        }
      },
      {
        "from": {
          "x": 40,
          "y": 28
        },
        "to": {
          "x": 55,
          "y": 35
        }
      },
      {
        "from": {
          "x": 55,
          "y": 35
        },
        "to": {
          "x": 60,
          "y": 30
        }
      },
      {
        "from": {
          "x": 60,
          "y": 30
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
        "x": 8,
        "y": 4,
        "label": "pocket"
      },
      {
        "x": 5,
        "y": 2.2,
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
    "source": "catalog_fallback",
    "ascii_table": "O───────────────────O───────────────────O\n│                                      ·│\n│                                  · ·  │\n│                              · ·      │\n│                             ·         │\n│                  ·····  · ·           │\n│              ····    ·1               │\n│          C····                        │\n│                 X                     │\n│                                       │\n│                                       │\n│                                       │\n│                                       │\n│                                       │\nO───────────────────O───────────────────O\nLegend: C=cue  1-9=object  X=blocker  O=pocket  ·=path"
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
      "x": 21,
      "y": 25.5
    },
    "object_ball_positions": [
      {
        "ballId": 1,
        "x": 45.6,
        "y": 25.2,
        "role": "object"
      },
      {
        "ballId": 2,
        "x": 58.6,
        "y": 25.2,
        "role": "object"
      }
    ],
    "intended_path": [
      {
        "from": {
          "x": 21,
          "y": 25.5
        },
        "to": {
          "x": 45,
          "y": 25
        }
      },
      {
        "from": {
          "x": 45,
          "y": 25
        },
        "to": {
          "x": 58,
          "y": 25
        }
      },
      {
        "from": {
          "x": 58,
          "y": 25
        },
        "to": {
          "x": 100,
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
        "x": 8,
        "y": 2,
        "label": "pocket"
      },
      {
        "x": 3.4,
        "y": 2,
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
    "source": "catalog_fallback",
    "ascii_table": "O───────────────────O───────────────────O\n│                                       │\n│                                       │\n│                                       │\n│                                       │\n│                                       │\n│                                       │\n│        C··· ····1····2 · · · · · · · ·│\n│                                       │\n│                                       │\n│                                       │\n│                                       │\n│                                       │\n│                                       │\nO───────────────────O───────────────────O\nLegend: C=cue  1-9=object  X=blocker  O=pocket  ·=path"
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
      "x": 23,
      "y": 25
    },
    "object_ball_positions": [
      {
        "ballId": 1,
        "x": 71.2,
        "y": 25,
        "role": "object"
      },
      {
        "ballId": 7,
        "x": 46.2,
        "y": 25,
        "role": "blocker"
      }
    ],
    "intended_path": [
      {
        "from": {
          "x": 23,
          "y": 25
        },
        "to": {
          "x": 45,
          "y": 32
        }
      },
      {
        "from": {
          "x": 45,
          "y": 32
        },
        "to": {
          "x": 70,
          "y": 25
        }
      },
      {
        "from": {
          "x": 70,
          "y": 25
        },
        "to": {
          "x": 100,
          "y": 25
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
        "x": 8,
        "y": 2,
        "label": "pocket"
      },
      {
        "x": 5.4,
        "y": 2,
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
    "source": "catalog_fallback",
    "ascii_table": "O───────────────────O───────────────────O\n│                                       │\n│                                       │\n│                                       │\n│                                       │\n│                 ·                     │\n│            ····· ·· ···               │\n│         C··      X     ·· 1·· ·· ·· ··│\n│                                       │\n│                                       │\n│                                       │\n│                                       │\n│                                       │\n│                                       │\nO───────────────────O───────────────────O\nLegend: C=cue  1-9=object  X=blocker  O=pocket  ·=path"
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
      "x": 36,
      "y": 25.5
    },
    "object_ball_positions": [
      {
        "ballId": 1,
        "x": 57.3,
        "y": 25.6,
        "role": "object"
      }
    ],
    "intended_path": [
      {
        "from": {
          "x": 36,
          "y": 25.5
        },
        "to": {
          "x": 57,
          "y": 25
        }
      },
      {
        "from": {
          "x": 57,
          "y": 25
        },
        "to": {
          "x": 100,
          "y": 20
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
        "x": 8,
        "y": 2,
        "label": "pocket"
      },
      {
        "x": 4.3,
        "y": 2,
        "label": "cb_rest"
      }
    ],
    "pocket_target": {
      "x": 100,
      "y": 20
    },
    "coordinate_system": {
      "x": "0=head rail → 100=foot rail",
      "y": "0=bottom long rail → 50=top long rail",
      "units": "normalized table percent (9-foot aspect 2:1)"
    },
    "source": "catalog_fallback",
    "ascii_table": "O───────────────────O───────────────────O\n│                                       │\n│                                       │\n│                                       │\n│                                       │\n│                                       │\n│                                       │\n│              C·······1 · · ·          │\n│                              · · · · ·│\n│                                       │\n│                                       │\n│                                       │\n│                                       │\n│                                       │\nO───────────────────O───────────────────O\nLegend: C=cue  1-9=object  X=blocker  O=pocket  ·=path"
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
      "x": 37,
      "y": 25
    },
    "object_ball_positions": [
      {
        "ballId": 1,
        "x": 55.9,
        "y": 11.4,
        "role": "object"
      },
      {
        "ballId": 9,
        "x": 70.9,
        "y": 37.4,
        "role": "object"
      }
    ],
    "intended_path": [
      {
        "from": {
          "x": 37,
          "y": 25
        },
        "to": {
          "x": 55,
          "y": 11
        }
      },
      {
        "from": {
          "x": 55,
          "y": 11
        },
        "to": {
          "x": 55,
          "y": 0
        }
      },
      {
        "from": {
          "x": 55,
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
        "x": 7.8,
        "y": 3.8,
        "label": "pocket"
      },
      {
        "x": 3.2,
        "y": 1.8,
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
    "source": "catalog_fallback",
    "ascii_table": "O───────────────────O───────────────────O\n│                                      ·│\n│                                       │\n│                                    ·  │\n│                           9      ·    │\n│                                       │\n│                                ·      │\n│              C·             ·         │\n│                ··                     │\n│                 ··        ·           │\n│                   ··1   ·             │\n│                     ·                 │\n│                     · ·               │\n│                     ·                 │\nO───────────────────O───────────────────O\nLegend: C=cue  1-9=object  X=blocker  O=pocket  ·=path"
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
      "x": 44,
      "y": 25.5
    },
    "object_ball_positions": [
      {
        "ballId": 1,
        "x": 59,
        "y": 25.2,
        "role": "object"
      }
    ],
    "intended_path": [
      {
        "from": {
          "x": 44,
          "y": 25.5
        },
        "to": {
          "x": 59,
          "y": 25
        }
      },
      {
        "from": {
          "x": 59,
          "y": 25
        },
        "to": {
          "x": 100,
          "y": 20
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
        "x": 8,
        "y": 2,
        "label": "pocket"
      },
      {
        "x": 4.3,
        "y": 2,
        "label": "cb_rest"
      }
    ],
    "pocket_target": {
      "x": 100,
      "y": 20
    },
    "coordinate_system": {
      "x": "0=head rail → 100=foot rail",
      "y": "0=bottom long rail → 50=top long rail",
      "units": "normalized table percent (9-foot aspect 2:1)"
    },
    "source": "catalog_fallback",
    "ascii_table": "O───────────────────O───────────────────O\n│                                       │\n│                                       │\n│                                       │\n│                                       │\n│                                       │\n│                                       │\n│                 C····1 · · ·          │\n│                              · · · · ·│\n│                                       │\n│                                       │\n│                                       │\n│                                       │\n│                                       │\nO───────────────────O───────────────────O\nLegend: C=cue  1-9=object  X=blocker  O=pocket  ·=path"
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
      "x": 15,
      "y": 10
    },
    "object_ball_positions": [
      {
        "ballId": 1,
        "x": 75.6,
        "y": 40,
        "role": "object"
      }
    ],
    "intended_path": [
      {
        "from": {
          "x": 15,
          "y": 10
        },
        "to": {
          "x": 50,
          "y": 0
        }
      },
      {
        "from": {
          "x": 50,
          "y": 0
        },
        "to": {
          "x": 85,
          "y": 50
        }
      },
      {
        "from": {
          "x": 85,
          "y": 50
        },
        "to": {
          "x": 75,
          "y": 40
        }
      },
      {
        "from": {
          "x": 75,
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
        "x": 8,
        "y": 4,
        "label": "pocket"
      },
      {
        "x": 5.8,
        "y": 3,
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
    "source": "catalog_fallback",
    "ascii_table": "O───────────────────O───────────────────O\n│                                ·    ··│\n│                              ·· ·· ·  │\n│                             1···      │\n│                             ·         │\n│                                       │\n│                           ·           │\n│                          ·            │\n│                                       │\n│                        ·              │\n│                      ·                │\n│      C· ·                             │\n│           ·· · ·    ·                 │\n│                 · ·                   │\nO───────────────────O───────────────────O\nLegend: C=cue  1-9=object  X=blocker  O=pocket  ·=path"
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
      "x": 26,
      "y": 17.5
    },
    "object_ball_positions": [
      {
        "ballId": 1,
        "x": 61.2,
        "y": 30.6,
        "role": "object"
      },
      {
        "ballId": 8,
        "x": 46.2,
        "y": 22.6,
        "role": "blocker"
      }
    ],
    "intended_path": [
      {
        "from": {
          "x": 26,
          "y": 17.5
        },
        "to": {
          "x": 40,
          "y": 28
        }
      },
      {
        "from": {
          "x": 40,
          "y": 28
        },
        "to": {
          "x": 55,
          "y": 35
        }
      },
      {
        "from": {
          "x": 55,
          "y": 35
        },
        "to": {
          "x": 60,
          "y": 30
        }
      },
      {
        "from": {
          "x": 60,
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
        "x": 8,
        "y": 4,
        "label": "pocket"
      },
      {
        "x": 5,
        "y": 2.2,
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
    "source": "catalog_fallback",
    "ascii_table": "O───────────────────O───────────────────O\n│                                      ·│\n│                                  · ·  │\n│                              · ·      │\n│                             ·         │\n│                  ·····  · ·           │\n│               ···    ·1               │\n│             ···                       │\n│           ···    X                    │\n│          C                            │\n│                                       │\n│                                       │\n│                                       │\n│                                       │\nO───────────────────O───────────────────O\nLegend: C=cue  1-9=object  X=blocker  O=pocket  ·=path"
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
      "x": 38,
      "y": 25
    },
    "object_ball_positions": [
      {
        "ballId": 1,
        "x": 57.3,
        "y": 25.4,
        "role": "object"
      }
    ],
    "intended_path": [
      {
        "from": {
          "x": 38,
          "y": 25
        },
        "to": {
          "x": 57,
          "y": 25
        }
      },
      {
        "from": {
          "x": 57,
          "y": 25
        },
        "to": {
          "x": 100,
          "y": 20
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
        "x": 8,
        "y": 2,
        "label": "pocket"
      },
      {
        "x": 4.3,
        "y": 2,
        "label": "cb_rest"
      }
    ],
    "pocket_target": {
      "x": 100,
      "y": 20
    },
    "coordinate_system": {
      "x": "0=head rail → 100=foot rail",
      "y": "0=bottom long rail → 50=top long rail",
      "units": "normalized table percent (9-foot aspect 2:1)"
    },
    "source": "catalog_fallback",
    "ascii_table": "O───────────────────O───────────────────O\n│                                       │\n│                                       │\n│                                       │\n│                                       │\n│                                       │\n│                                       │\n│              C·······1 · · ·          │\n│                              · · · · ·│\n│                                       │\n│                                       │\n│                                       │\n│                                       │\n│                                       │\nO───────────────────O───────────────────O\nLegend: C=cue  1-9=object  X=blocker  O=pocket  ·=path"
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
      "y": 10.5
    },
    "object_ball_positions": [
      {
        "ballId": 1,
        "x": 75.9,
        "y": 40.2,
        "role": "object"
      }
    ],
    "intended_path": [
      {
        "from": {
          "x": 18,
          "y": 10.5
        },
        "to": {
          "x": 50,
          "y": 0
        }
      },
      {
        "from": {
          "x": 50,
          "y": 0
        },
        "to": {
          "x": 85,
          "y": 50
        }
      },
      {
        "from": {
          "x": 85,
          "y": 50
        },
        "to": {
          "x": 75,
          "y": 40
        }
      },
      {
        "from": {
          "x": 75,
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
        "x": 8,
        "y": 4,
        "label": "pocket"
      },
      {
        "x": 5.8,
        "y": 3,
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
    "source": "catalog_fallback",
    "ascii_table": "O───────────────────O───────────────────O\n│                                ·    ··│\n│                              ·· ·· ·  │\n│                             1···      │\n│                             ·         │\n│                                       │\n│                           ·           │\n│                          ·            │\n│                                       │\n│                        ·              │\n│       C              ·                │\n│        · ··                           │\n│             ·· ·    ·                 │\n│                 · ·                   │\nO───────────────────O───────────────────O\nLegend: C=cue  1-9=object  X=blocker  O=pocket  ·=path"
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
      "x": 21,
      "y": 29
    },
    "object_ball_positions": [
      {
        "ballId": 1,
        "x": 45,
        "y": 25,
        "role": "object"
      },
      {
        "ballId": 2,
        "x": 58,
        "y": 25,
        "role": "object"
      }
    ],
    "intended_path": [
      {
        "from": {
          "x": 21,
          "y": 29
        },
        "to": {
          "x": 45,
          "y": 25
        }
      },
      {
        "from": {
          "x": 45,
          "y": 25
        },
        "to": {
          "x": 58,
          "y": 25
        }
      },
      {
        "from": {
          "x": 58,
          "y": 25
        },
        "to": {
          "x": 100,
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
        "x": 8,
        "y": 2,
        "label": "pocket"
      },
      {
        "x": 3.4,
        "y": 2,
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
    "source": "catalog_fallback",
    "ascii_table": "O───────────────────O───────────────────O\n│                                       │\n│                                       │\n│                                       │\n│                                       │\n│                                       │\n│        C···                           │\n│             ····1····2 · · · · · · · ·│\n│                                       │\n│                                       │\n│                                       │\n│                                       │\n│                                       │\n│                                       │\nO───────────────────O───────────────────O\nLegend: C=cue  1-9=object  X=blocker  O=pocket  ·=path"
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
      "y": 25.5
    },
    "object_ball_positions": [
      {
        "ballId": 1,
        "x": 50.6,
        "y": 25.6,
        "role": "object"
      },
      {
        "ballId": 8,
        "x": 65.6,
        "y": 18.6,
        "role": "object"
      }
    ],
    "intended_path": [
      {
        "from": {
          "x": 20,
          "y": 25.5
        },
        "to": {
          "x": 50,
          "y": 25
        }
      },
      {
        "from": {
          "x": 50,
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
        "x": 8,
        "y": 4,
        "label": "pocket"
      },
      {
        "x": 3.8,
        "y": 2,
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
    "source": "catalog_fallback",
    "ascii_table": "O───────────────────O───────────────────O\n│                                      ·│\n│                                    ·  │\n│                               · ·     │\n│                             ·         │\n│                          ·            │\n│                     ·  ·              │\n│        C·· ·· ·· ·1                   │\n│                                       │\n│                         8             │\n│                                       │\n│                                       │\n│                                       │\n│                                       │\nO───────────────────O───────────────────O\nLegend: C=cue  1-9=object  X=blocker  O=pocket  ·=path"
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
      "x": 20,
      "y": 26
    },
    "object_ball_positions": [
      {
        "ballId": 1,
        "x": 46.2,
        "y": 25.4,
        "role": "object"
      },
      {
        "ballId": 2,
        "x": 59.2,
        "y": 25.4,
        "role": "object"
      },
      {
        "ballId": 3,
        "x": 73.2,
        "y": 25.4,
        "role": "object"
      }
    ],
    "intended_path": [
      {
        "from": {
          "x": 20,
          "y": 26
        },
        "to": {
          "x": 45,
          "y": 25
        }
      },
      {
        "from": {
          "x": 45,
          "y": 25
        },
        "to": {
          "x": 58,
          "y": 25
        }
      },
      {
        "from": {
          "x": 58,
          "y": 25
        },
        "to": {
          "x": 100,
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
        "x": 8,
        "y": 2,
        "label": "pocket"
      },
      {
        "x": 3.4,
        "y": 2,
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
    "source": "catalog_fallback",
    "ascii_table": "O───────────────────O───────────────────O\n│                                       │\n│                                       │\n│                                       │\n│                                       │\n│                                       │\n│                                       │\n│        C···· ····1···2 · · 3 · · · · ·│\n│                                       │\n│                                       │\n│                                       │\n│                                       │\n│                                       │\n│                                       │\nO───────────────────O───────────────────O\nLegend: C=cue  1-9=object  X=blocker  O=pocket  ·=path"
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
      "x": 19,
      "y": 25.5
    },
    "object_ball_positions": [
      {
        "ballId": 1,
        "x": 54.3,
        "y": 25.2,
        "role": "object"
      },
      {
        "ballId": 8,
        "x": 65.3,
        "y": 20.2,
        "role": "object"
      }
    ],
    "intended_path": [
      {
        "from": {
          "x": 19,
          "y": 25.5
        },
        "to": {
          "x": 54,
          "y": 25
        }
      },
      {
        "from": {
          "x": 54,
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
        "x": 8,
        "y": 4,
        "label": "pocket"
      },
      {
        "x": 3.8,
        "y": 2,
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
    "source": "catalog_fallback",
    "ascii_table": "O───────────────────O───────────────────O\n│                                      ·│\n│                                    ·  │\n│                               ·  ·    │\n│                             ·         │\n│                           ·           │\n│                       · ·             │\n│       C · ·· · ·· · 1                 │\n│                         8             │\n│                                       │\n│                                       │\n│                                       │\n│                                       │\n│                                       │\nO───────────────────O───────────────────O\nLegend: C=cue  1-9=object  X=blocker  O=pocket  ·=path"
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
        "x": 75.9,
        "y": 40,
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
          "x": 50,
          "y": 0
        }
      },
      {
        "from": {
          "x": 50,
          "y": 0
        },
        "to": {
          "x": 85,
          "y": 50
        }
      },
      {
        "from": {
          "x": 85,
          "y": 50
        },
        "to": {
          "x": 75,
          "y": 40
        }
      },
      {
        "from": {
          "x": 75,
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
        "x": 8,
        "y": 4,
        "label": "pocket"
      },
      {
        "x": 5.8,
        "y": 3,
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
    "source": "catalog_fallback",
    "ascii_table": "O───────────────────O───────────────────O\n│                                ·    ··│\n│                              ·· ·· ·  │\n│                             1···      │\n│                             ·         │\n│                                       │\n│                           ·           │\n│                          ·            │\n│                                       │\n│                        ·              │\n│                      ·                │\n│        C··                            │\n│            ·· ··    ·                 │\n│                  ··                   │\nO───────────────────O───────────────────O\nLegend: C=cue  1-9=object  X=blocker  O=pocket  ·=path"
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
      "x": 24,
      "y": 25.5
    },
    "object_ball_positions": [
      {
        "ballId": 1,
        "x": 70,
        "y": 25.6,
        "role": "object"
      },
      {
        "ballId": 7,
        "x": 45,
        "y": 25.6,
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
          "x": 45,
          "y": 32
        }
      },
      {
        "from": {
          "x": 45,
          "y": 32
        },
        "to": {
          "x": 70,
          "y": 25
        }
      },
      {
        "from": {
          "x": 70,
          "y": 25
        },
        "to": {
          "x": 100,
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
        "x": 8,
        "y": 2,
        "label": "pocket"
      },
      {
        "x": 5.4,
        "y": 2,
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
    "source": "catalog_fallback",
    "ascii_table": "O───────────────────O───────────────────O\n│                                       │\n│                                       │\n│                                       │\n│                                       │\n│                 ·                     │\n│           ······ ·· ···               │\n│         C·      X      ·· 1·· ·· ·· ··│\n│                                       │\n│                                       │\n│                                       │\n│                                       │\n│                                       │\n│                                       │\nO───────────────────O───────────────────O\nLegend: C=cue  1-9=object  X=blocker  O=pocket  ·=path"
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
      "x": 31,
      "y": 25
    },
    "object_ball_positions": [
      {
        "ballId": 1,
        "x": 55.6,
        "y": 8.4,
        "role": "object"
      },
      {
        "ballId": 9,
        "x": 70.6,
        "y": 40.4,
        "role": "object"
      }
    ],
    "intended_path": [
      {
        "from": {
          "x": 31,
          "y": 25
        },
        "to": {
          "x": 55,
          "y": 8
        }
      },
      {
        "from": {
          "x": 55,
          "y": 8
        },
        "to": {
          "x": 55,
          "y": 0
        }
      },
      {
        "from": {
          "x": 55,
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
        "x": 7.8,
        "y": 3.8,
        "label": "pocket"
      },
      {
        "x": 3.2,
        "y": 1.8,
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
    "source": "catalog_fallback",
    "ascii_table": "O───────────────────O───────────────────O\n│                                      ·│\n│                                       │\n│                           9        ·  │\n│                                  ·    │\n│                                       │\n│                                ·      │\n│            C                ·         │\n│             ··                        │\n│               ··          ·           │\n│                 · ·     ·             │\n│                    ·1                 │\n│                     · ·               │\n│                     ·                 │\nO───────────────────O───────────────────O\nLegend: C=cue  1-9=object  X=blocker  O=pocket  ·=path"
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
      "x": 20,
      "y": 25.5
    },
    "object_ball_positions": [
      {
        "ballId": 1,
        "x": 53.2,
        "y": 25.2,
        "role": "object"
      },
      {
        "ballId": 8,
        "x": 66.2,
        "y": 19.2,
        "role": "object"
      }
    ],
    "intended_path": [
      {
        "from": {
          "x": 20,
          "y": 25.5
        },
        "to": {
          "x": 52,
          "y": 25
        }
      },
      {
        "from": {
          "x": 52,
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
        "x": 8,
        "y": 4,
        "label": "pocket"
      },
      {
        "x": 3.8,
        "y": 2,
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
    "source": "catalog_fallback",
    "ascii_table": "O───────────────────O───────────────────O\n│                                      ·│\n│                                    ·  │\n│                               · ·     │\n│                             ·         │\n│                           ·           │\n│                      · ·              │\n│        C· ·· ·· ·· 1                  │\n│                         8             │\n│                                       │\n│                                       │\n│                                       │\n│                                       │\n│                                       │\nO───────────────────O───────────────────O\nLegend: C=cue  1-9=object  X=blocker  O=pocket  ·=path"
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
      "x": 36,
      "y": 25
    },
    "object_ball_positions": [
      {
        "ballId": 1,
        "x": 57.3,
        "y": 25,
        "role": "object"
      }
    ],
    "intended_path": [
      {
        "from": {
          "x": 36,
          "y": 25
        },
        "to": {
          "x": 57,
          "y": 25
        }
      },
      {
        "from": {
          "x": 57,
          "y": 25
        },
        "to": {
          "x": 100,
          "y": 20
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
        "x": 8,
        "y": 2,
        "label": "pocket"
      },
      {
        "x": 4.3,
        "y": 2,
        "label": "cb_rest"
      }
    ],
    "pocket_target": {
      "x": 100,
      "y": 20
    },
    "coordinate_system": {
      "x": "0=head rail → 100=foot rail",
      "y": "0=bottom long rail → 50=top long rail",
      "units": "normalized table percent (9-foot aspect 2:1)"
    },
    "source": "catalog_fallback",
    "ascii_table": "O───────────────────O───────────────────O\n│                                       │\n│                                       │\n│                                       │\n│                                       │\n│                                       │\n│                                       │\n│              C·······1 · · ·          │\n│                              · · · · ·│\n│                                       │\n│                                       │\n│                                       │\n│                                       │\n│                                       │\nO───────────────────O───────────────────O\nLegend: C=cue  1-9=object  X=blocker  O=pocket  ·=path"
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
      "x": 40,
      "y": 25.5
    },
    "object_ball_positions": [
      {
        "ballId": 1,
        "x": 58.9,
        "y": 25.6,
        "role": "object"
      }
    ],
    "intended_path": [
      {
        "from": {
          "x": 40,
          "y": 25.5
        },
        "to": {
          "x": 58,
          "y": 25
        }
      },
      {
        "from": {
          "x": 58,
          "y": 25
        },
        "to": {
          "x": 100,
          "y": 30
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
        "x": 8,
        "y": 2,
        "label": "pocket"
      },
      {
        "x": 4.3,
        "y": 2,
        "label": "cb_rest"
      }
    ],
    "pocket_target": {
      "x": 100,
      "y": 30
    },
    "coordinate_system": {
      "x": "0=head rail → 100=foot rail",
      "y": "0=bottom long rail → 50=top long rail",
      "units": "normalized table percent (9-foot aspect 2:1)"
    },
    "source": "catalog_fallback",
    "ascii_table": "O───────────────────O───────────────────O\n│                                       │\n│                                       │\n│                                       │\n│                                       │\n│                                       │\n│                              · · · · ·│\n│               C······1 · · ·          │\n│                                       │\n│                                       │\n│                                       │\n│                                       │\n│                                       │\n│                                       │\nO───────────────────O───────────────────O\nLegend: C=cue  1-9=object  X=blocker  O=pocket  ·=path"
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
      "x": 26,
      "y": 25
    },
    "object_ball_positions": [
      {
        "ballId": 1,
        "x": 70,
        "y": 25.4,
        "role": "object"
      },
      {
        "ballId": 7,
        "x": 45,
        "y": 25.4,
        "role": "blocker"
      }
    ],
    "intended_path": [
      {
        "from": {
          "x": 26,
          "y": 25
        },
        "to": {
          "x": 45,
          "y": 32
        }
      },
      {
        "from": {
          "x": 45,
          "y": 32
        },
        "to": {
          "x": 70,
          "y": 25
        }
      },
      {
        "from": {
          "x": 70,
          "y": 25
        },
        "to": {
          "x": 100,
          "y": 25
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
        "x": 8,
        "y": 2,
        "label": "pocket"
      },
      {
        "x": 5.4,
        "y": 2,
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
    "source": "catalog_fallback",
    "ascii_table": "O───────────────────O───────────────────O\n│                                       │\n│                                       │\n│                                       │\n│                                       │\n│                 ·                     │\n│             ···· ·· ···               │\n│          C··    X      ·· 1·· ·· ·· ··│\n│                                       │\n│                                       │\n│                                       │\n│                                       │\n│                                       │\n│                                       │\nO───────────────────O───────────────────O\nLegend: C=cue  1-9=object  X=blocker  O=pocket  ·=path"
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
      "x": 30,
      "y": 25.5
    },
    "object_ball_positions": [
      {
        "ballId": 1,
        "x": 55.6,
        "y": 8.2,
        "role": "object"
      },
      {
        "ballId": 9,
        "x": 70.6,
        "y": 40.2,
        "role": "object"
      }
    ],
    "intended_path": [
      {
        "from": {
          "x": 30,
          "y": 25.5
        },
        "to": {
          "x": 55,
          "y": 8
        }
      },
      {
        "from": {
          "x": 55,
          "y": 8
        },
        "to": {
          "x": 55,
          "y": 0
        }
      },
      {
        "from": {
          "x": 55,
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
        "x": 7.8,
        "y": 3.8,
        "label": "pocket"
      },
      {
        "x": 3.2,
        "y": 1.8,
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
    "source": "catalog_fallback",
    "ascii_table": "O───────────────────O───────────────────O\n│                                      ·│\n│                                       │\n│                           9        ·  │\n│                                  ·    │\n│                                       │\n│                                ·      │\n│           C ·               ·         │\n│              ··                       │\n│                ·          ·           │\n│                 · ·     ·             │\n│                    ·1                 │\n│                     · ·               │\n│                     ·                 │\nO───────────────────O───────────────────O\nLegend: C=cue  1-9=object  X=blocker  O=pocket  ·=path"
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
      "x": 19,
      "y": 25
    },
    "object_ball_positions": [
      {
        "ballId": 1,
        "x": 53.2,
        "y": 25,
        "role": "object"
      },
      {
        "ballId": 8,
        "x": 66.2,
        "y": 19,
        "role": "object"
      }
    ],
    "intended_path": [
      {
        "from": {
          "x": 19,
          "y": 25
        },
        "to": {
          "x": 52,
          "y": 25
        }
      },
      {
        "from": {
          "x": 52,
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
        "x": 8,
        "y": 4,
        "label": "pocket"
      },
      {
        "x": 3.8,
        "y": 2,
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
    "source": "catalog_fallback",
    "ascii_table": "O───────────────────O───────────────────O\n│                                      ·│\n│                                    ·  │\n│                               · ·     │\n│                             ·         │\n│                           ·           │\n│                      · ·              │\n│       C ·· ·· · ·· 1                  │\n│                         8             │\n│                                       │\n│                                       │\n│                                       │\n│                                       │\n│                                       │\nO───────────────────O───────────────────O\nLegend: C=cue  1-9=object  X=blocker  O=pocket  ·=path"
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
