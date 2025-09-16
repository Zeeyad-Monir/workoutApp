import {
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
} from 'firebase/firestore';
import { db } from '../firebase';

export const DEFAULT_BPR_CONFIG = {
  DECAY: 0.9,
  K: 5,
  MU0: 0.5,
  MAX_HISTORY: 40,
  INACTIVE_AFTER_DAYS: 60,
  INACTIVE_WEEKLY_FACTOR: 0.99,
};

const MS_IN_DAY = 24 * 60 * 60 * 1000;

const isValidDate = (value) => value instanceof Date && !Number.isNaN(value.getTime());

const toDate = (value) => {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value.toDate === 'function') {
    const converted = value.toDate();
    return isValidDate(converted) ? converted : null;
  }
  const converted = new Date(value);
  return isValidDate(converted) ? converted : null;
};

const normalizeRank = (fieldSize, rank) => {
  if (!fieldSize || fieldSize < 2) {
    return { valid: false, score: null };
  }
  if (!rank || !Number.isFinite(rank) || rank < 1 || rank > fieldSize) {
    return { valid: false, score: null };
  }
  // Placement score between 0 and 1.
  const score = (fieldSize - rank) / (fieldSize - 1);
  return { valid: true, score };
};

const computeLast5Average = (placements, config) => {
  const recent = placements.slice(0, 5);
  if (recent.length === 0) {
    return config.MU0;
  }

  let sumWeighted = 0;
  let sumWeights = 0;
  recent.forEach((placement, index) => {
    const weight = Math.pow(config.DECAY, index + 1);
    sumWeighted += weight * placement.score;
    sumWeights += weight;
  });

  return sumWeights > 0 ? sumWeighted / sumWeights : config.MU0;
};

const computeInactivityPenalty = (baseBpr, lastEndedAt, now, config) => {
  if (!lastEndedAt) {
    return { bpr: baseBpr, inactiveDays: null };
  }

  const inactiveDays = Math.floor((now.getTime() - lastEndedAt.getTime()) / MS_IN_DAY);
  if (inactiveDays <= config.INACTIVE_AFTER_DAYS) {
    return { bpr: baseBpr, inactiveDays };
  }

  const extraDays = inactiveDays - config.INACTIVE_AFTER_DAYS;
  const inactiveWeeks = Math.floor(extraDays / 7);
  if (inactiveWeeks <= 0) {
    return { bpr: baseBpr, inactiveDays };
  }

  const decayed = baseBpr * Math.pow(config.INACTIVE_WEEKLY_FACTOR, inactiveWeeks);
  return {
    bpr: Math.max(decayed, config.MU0),
    inactiveDays,
  };
};

export const fetchUserCompetitionPlacements = async (userId, config = DEFAULT_BPR_CONFIG) => {
  if (!userId) return [];

  const fetchLimit = Math.min(80, config.MAX_HISTORY + 20);
  const competitionsQuery = query(
    collection(db, 'competitions'),
    where('status', '==', 'completed'),
    where('participants', 'array-contains', userId),
    orderBy('endDate', 'desc'),
    limit(fetchLimit)
  );

  const snapshot = await getDocs(competitionsQuery);
  const placements = [];

  snapshot.forEach((docSnap) => {
    const data = docSnap.data();
    const finalRankings = Array.isArray(data.finalRankings) ? data.finalRankings : [];
    const ranking = finalRankings.find((entry) => entry?.userId === userId);
    if (!ranking || ranking.position == null) {
      return;
    }

    const rawRank = Number(ranking.position);
    const participantsCount = Array.isArray(data.participants) ? data.participants.length : 0;
    const rankingCount = finalRankings.filter((entry) => entry?.position != null).length;
    const fieldSize = Math.max(participantsCount, rankingCount);

    const endedAt = toDate(data.completedAt) || toDate(data.endDate);
    if (!endedAt) {
      return;
    }

    placements.push({
      competitionId: docSnap.id,
      fieldSize,
      rank: rawRank,
      endedAt,
      name: data.name || '',
      points: ranking.points ?? null,
    });
  });

  return placements;
};

export const computeBprMetrics = (placements, now = new Date(), config = DEFAULT_BPR_CONFIG) => {
  if (!Array.isArray(placements) || placements.length === 0) {
    const baseBpr = (config.MU0 * config.K) / (config.K);
    return {
      bpr: baseBpr,
      competitionsCount: 0,
      provisional: true,
      last5Form: [],
      avgScore: config.MU0,
      sumWeights: 0,
      last5Average: config.MU0,
      lastPlacement: null,
      inactiveDays: null,
      lastEndedAt: null,
    };
  }

  const sorted = [...placements]
    .sort((a, b) => b.endedAt.getTime() - a.endedAt.getTime())
    .slice(0, config.MAX_HISTORY);

  const enriched = [];
  let weightSum = 0;
  let weightedScoreSum = 0;

  sorted.forEach((placement, index) => {
    const { valid, score } = normalizeRank(placement.fieldSize, placement.rank);
    if (!valid) {
      return;
    }

    const wSize = Math.log2(placement.fieldSize);
    if (!Number.isFinite(wSize) || wSize <= 0) {
      return;
    }

    const decayWeight = Math.pow(config.DECAY, index + 1);
    const weight = wSize * decayWeight;

    weightSum += weight;
    weightedScoreSum += weight * score;

    enriched.push({
      ...placement,
      score,
      weight,
      order: index + 1,
    });
  });

  const competitionsCount = enriched.length;
  const avgScore = weightSum > 0 ? weightedScoreSum / weightSum : config.MU0;
  const baseBpr = (avgScore * competitionsCount + config.MU0 * config.K) /
    (competitionsCount + config.K);

  const lastEndedAt = sorted.length > 0 ? sorted[0].endedAt : null;
  const { bpr: decayedBpr, inactiveDays } = computeInactivityPenalty(baseBpr, lastEndedAt, now, config);

  const last5Average = computeLast5Average(enriched, config);
  const lastPlacement = enriched.length > 0 ? enriched[0].rank : null;
  const last5Form = enriched.slice(0, 5).map((placement) => (placement.rank === 1 ? 'W' : 'L'));

  return {
    bpr: decayedBpr,
    competitionsCount,
    provisional: competitionsCount < 3,
    last5Form,
    avgScore,
    sumWeights: weightSum,
    last5Average,
    lastPlacement,
    inactiveDays,
    lastEndedAt,
  };
};

export const rankFriendGroup = (entries, config = DEFAULT_BPR_CONFIG) => {
  if (!Array.isArray(entries) || entries.length === 0) {
    return [];
  }

  const ranked = [...entries].sort((a, b) => {
    if (b.metrics.bpr !== a.metrics.bpr) {
      return b.metrics.bpr - a.metrics.bpr;
    }
    if (b.metrics.competitionsCount !== a.metrics.competitionsCount) {
      return b.metrics.competitionsCount - a.metrics.competitionsCount;
    }
    if (b.metrics.last5Average !== a.metrics.last5Average) {
      return b.metrics.last5Average - a.metrics.last5Average;
    }
    const aPlacement = a.metrics.lastPlacement ?? Number.POSITIVE_INFINITY;
    const bPlacement = b.metrics.lastPlacement ?? Number.POSITIVE_INFINITY;
    if (aPlacement !== bPlacement) {
      return aPlacement - bPlacement;
    }
    return 0;
  });

  const total = ranked.length;
  ranked.forEach((entry, index) => {
    const others = total - 1;
    const strictlyBelow = total - (index + 1);
    let percentile = null;
    if (others <= 0) {
      percentile = null;
    } else if (others === 1) {
      percentile = 50;
    } else {
      percentile = (strictlyBelow / others) * 100;
    }

    ranked[index] = {
      ...entry,
      rank: index + 1,
      friendsCount: total,
      friendsPercentile: percentile,
    };
  });

  return ranked;
};

export const computeFriendGroupRanking = async (
  userId,
  friendIds,
  config = DEFAULT_BPR_CONFIG,
) => {
  const uniqueIds = Array.from(new Set([userId, ...(friendIds || [])])).filter(Boolean);
  if (uniqueIds.length === 0) {
    return [];
  }

  const now = new Date();

  const placementsMap = await Promise.all(
    uniqueIds.map(async (id) => {
      const placements = await fetchUserCompetitionPlacements(id, config);
      const metrics = computeBprMetrics(placements, now, config);
      return { userId: id, placements, metrics };
    })
  );

  return rankFriendGroup(placementsMap, config);
};

export default {
  DEFAULT_BPR_CONFIG,
  fetchUserCompetitionPlacements,
  computeBprMetrics,
  rankFriendGroup,
  computeFriendGroupRanking,
};
