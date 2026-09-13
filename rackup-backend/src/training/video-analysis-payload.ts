/**
 * Contract payload for rackup-coach video_analysis / coach analyze.
 * Store URL + meta; send observations — never raw video bytes.
 */

export type VideoSourceKind = 'upload' | 'youtube' | 'url' | 'none';

export type VideoMeta = {
  url: string;
  source: Exclude<VideoSourceKind, 'none'>;
  kind: 'youtube' | 'file_url';
  bytes_included: false;
};

export function classifyVideoSource(url?: string | null): VideoSourceKind {
  const u = (url ?? '').trim();
  if (!u) return 'none';
  const lower = u.toLowerCase();
  if (
    lower.includes('youtube.com') ||
    lower.includes('youtu.be') ||
    lower.includes('youtube.com/shorts')
  ) {
    return 'youtube';
  }
  if (
    lower.includes('/uploads/') ||
    lower.includes('/clips/') ||
    lower.includes('clips/')
  ) {
    return 'upload';
  }
  return 'url';
}

export function buildCoachAnalyzePayload(input: {
  videoUrl?: string;
  notes?: string;
  game?: string;
  focus?: string;
}): {
  mode: 'video_analysis' | 'full';
  video_meta?: VideoMeta;
  video_url?: string;
  observations: string;
  notes?: string;
  game: string;
  focus: string;
  question: string;
  prefer_local: false;
  allow_cloud_llm: true;
  vision_bytes: false;
} {
  const source = classifyVideoSource(input.videoUrl);
  const observations = (input.notes ?? '').trim();
  const videoUrl = (input.videoUrl ?? '').trim() || undefined;
  return {
    mode: videoUrl ? 'video_analysis' : 'full',
    ...(videoUrl
      ? {
          video_meta: {
            url: videoUrl,
            source: source === 'none' ? 'url' : source,
            kind: source === 'youtube' ? 'youtube' : 'file_url',
            bytes_included: false as const,
          },
          video_url: videoUrl,
        }
      : {}),
    observations,
    notes: observations || undefined,
    game: input.game ?? '9-ball',
    focus: input.focus ?? 'general',
    question: observations || 'Analyze this shot and give 3 concrete fixes.',
    prefer_local: false,
    allow_cloud_llm: true,
    vision_bytes: false,
  };
}
