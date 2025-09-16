import React, { useEffect, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import AnimatedCounter from './AnimatedCounter';

const gradientColors = ['#DCFCE7', '#BBF7D0'];
const gradientEnd = { x: 1, y: 1 };

const clampPercentile = (value) => {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return null;
  }
  return Math.min(100, Math.max(0, value));
};

const formatBpr = (value) => {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return '--';
  }
  return value.toFixed(2);
};

export default function CompetitiveRank({ wins = 0, losses = 0, rankingState }) {
  const scaleAnim = useRef(new Animated.Value(0.95)).current;

  useEffect(() => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      tension: 40,
      friction: 6,
      useNativeDriver: true,
    }).start();
  }, []);

  const { loading, entries, userEntry, error } = rankingState || {};
  const friendsCount = userEntry?.friendsCount ?? entries?.length ?? 0;
  const percentile = clampPercentile(userEntry?.friendsPercentile);
  const bprScore = userEntry?.metrics?.bpr ?? null;
  const competitionsCount = userEntry?.metrics?.competitionsCount ?? 0;
  const provisional = userEntry?.metrics?.provisional ?? true;
  const last5Form = userEntry?.metrics?.last5Form ?? [];
  const inactiveDays = userEntry?.metrics?.inactiveDays;
  const avgScore = userEntry?.metrics?.avgScore ?? null;
  const topFriends = useMemo(() => {
    if (!Array.isArray(entries) || entries.length === 0) {
      return [];
    }
    const top = entries.slice(0, 3);
    if (!userEntry) {
      return top;
    }
    const isInTop = top.some(entry => entry.userId === userEntry.userId);
    if (isInTop) {
      return top;
    }
    return [...top, userEntry];
  }, [entries, userEntry]);

  const hasFriends = friendsCount > 1;
  const inactivityFlag = typeof inactiveDays === 'number' && inactiveDays > 60;

  const formChips = last5Form.length > 0 ? last5Form : ['—', '—', '—', '—', '—'];

  return (
    <Animated.View style={[styles.container, { transform: [{ scale: scaleAnim }] }] }>
      <LinearGradient
        colors={gradientColors}
        start={{ x: 0, y: 0 }}
        end={gradientEnd}
        style={styles.gradient}
      >
        <View style={styles.content}>
          <View style={styles.headerRow}>
            <View style={styles.titleRow}>
              <View style={styles.iconCircle}>
                <Ionicons name="people" size={20} color="#15803D" />
              </View>
              <View>
                <Text style={styles.title}>Friends Rank</Text>
                <Text style={styles.subtitle}>Score adjusts for field size, recency, and sample size</Text>
              </View>
            </View>
            {provisional && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>Provisional</Text>
              </View>
            )}
          </View>

          {loading ? (
            <Text style={styles.statusText}>Calculating Bayesian Placement Rating…</Text>
          ) : error ? (
            <Text style={[styles.statusText, styles.errorText]}>{error}</Text>
          ) : (
            <>
              <View style={styles.metricsGrid}>
                <View style={styles.metricCard}>
                  <Text style={styles.metricEyebrow}>BPR score</Text>
                  <AnimatedCounter
                    value={typeof bprScore === 'number' && !Number.isNaN(bprScore) ? bprScore : 0}
                    duration={600}
                    style={styles.metricValuePrimary}
                    format={(val) => (
                      typeof bprScore === 'number' && !Number.isNaN(bprScore)
                        ? (Math.round(val * 100) / 100).toFixed(2)
                        : '--'
                    )}
                  />
                  <Text style={styles.metricSubtext}>0 – 1 scale</Text>
                </View>
                <View style={styles.metricCard}>
                  <Text style={styles.metricEyebrow}>Top percentile</Text>
                  <AnimatedCounter
                    value={typeof percentile === 'number' ? percentile : 0}
                    duration={600}
                    style={styles.metricValuePrimary}
                    format={(val) => (
                      typeof percentile === 'number'
                        ? `${Math.round(val)}%`
                        : '--'
                    )}
                  />
                  <Text style={styles.metricSubtext}>{hasFriends ? 'Among your friends' : 'Add friends to unlock'}</Text>
                </View>
                <View style={styles.metricCard}>
                  <Text style={styles.metricEyebrow}>Friends rank</Text>
                  <Text style={styles.metricValuePrimary}>
                    {userEntry?.rank ? `#${userEntry.rank}` : '--'}
                    {friendsCount ? <Text style={styles.metricOutOf}>/{friendsCount}</Text> : null}
                  </Text>
                  <Text style={styles.metricSubtext}>{hasFriends ? 'Higher is better' : 'Waiting for friends'}</Text>
                </View>
              </View>

              <View style={styles.secondaryGrid}>
                <View style={styles.secondaryCard}>
                  <Text style={styles.secondaryLabel}>Competitions counted</Text>
                  <Text style={styles.secondaryValue}>{competitionsCount}</Text>
                </View>
                <View style={styles.secondaryCard}>
                  <Text style={styles.secondaryLabel}>Form (last 5)</Text>
                  <View style={styles.formRow}>
                    {formChips.map((result, index) => (
                      <View
                        key={`${result}-${index}`}
                        style={[
                          styles.formChip,
                          result === 'W' ? styles.formChipWin : result === 'L' ? styles.formChipLoss : styles.formChipNeutral,
                          index !== formChips.length - 1 ? styles.formChipSpacing : null,
                        ]}
                      >
                        <Text
                          style={[
                            styles.formChipText,
                            result !== 'W' && result !== 'L' ? styles.formChipTextNeutral : null,
                          ]}
                        >
                          {result}
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>
              </View>

              <View style={styles.recordRow}>
                <Ionicons name="trophy" size={16} color="#15803D" style={styles.recordIcon} />
                <Text style={styles.recordText}>
                  Record {wins}-{losses}
                  {avgScore != null ? ` • Avg placement score ${formatBpr(avgScore)}` : ''}
                  {inactivityFlag ? ` • ${inactiveDays} days since last competition` : ''}
                </Text>
              </View>

              {hasFriends ? (
                <View style={styles.leaderboard}>
                  <View style={styles.leaderboardHeader}>
                    <Text style={styles.leaderboardTitle}>Friend standings</Text>
                    <Text style={styles.leaderboardSubtitle}>Top performers by BPR</Text>
                  </View>
                  {topFriends.map((entry, index) => {
                    const isLast = index === topFriends.length - 1;
                    return (
                      <View
                        key={entry.userId}
                        style={[
                          styles.leaderboardRow,
                          entry.userId === userEntry?.userId ? styles.leaderboardRowActive : null,
                          !isLast ? styles.leaderboardRowDivider : null,
                        ]}
                      >
                        <View style={styles.leaderboardRank}>
                          <Text style={styles.leaderboardRankText}>{entry.rank}</Text>
                        </View>
                        <View style={styles.leaderboardInfo}>
                          <Text style={styles.leaderboardName} numberOfLines={1}>
                            {entry.profile?.username || 'Friend'}
                            {entry.userId === userEntry?.userId ? ' (You)' : ''}
                          </Text>
                          {entry.profile?.handle ? (
                            <Text style={styles.leaderboardHandle} numberOfLines={1}>@{entry.profile.handle}</Text>
                          ) : null}
                        </View>
                        <Text style={styles.leaderboardScore}>{formatBpr(entry.metrics?.bpr)}</Text>
                      </View>
                    );
                  })}
                </View>
              ) : (
                <View style={styles.emptyState}>
                  <Ionicons name="people-circle" size={28} color="#6B7280" style={styles.emptyIcon} />
                  <Text style={styles.emptyText}>Add friends to see how your ranking stacks up.</Text>
                </View>
              )}
            </>
          )}
        </View>
      </LinearGradient>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 12,
    borderRadius: 20,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.12,
        shadowRadius: 10,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  gradient: {
    borderRadius: 20,
  },
  content: {
    padding: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.75)',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#86EFAC',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
  },
  subtitle: {
    fontSize: 13,
    color: '#4B5563',
    marginTop: 2,
  },
  badge: {
    backgroundColor: '#FBBF24',
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 999,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#92400E',
  },
  statusText: {
    marginTop: 16,
    fontSize: 14,
    color: '#4B5563',
  },
  errorText: {
    color: '#B91C1C',
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: 18,
  },
  metricCard: {
    width: '32%',
    minWidth: 100,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 12,
    marginBottom: 12,
    alignItems: 'flex-start',
  },
  metricEyebrow: {
    fontSize: 12,
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 6,
  },
  metricValuePrimary: {
    fontSize: 24,
    fontWeight: '700',
    color: '#0F172A',
  },
  metricSubtext: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 6,
  },
  metricOutOf: {
    fontSize: 14,
    color: '#94A3B8',
  },
  secondaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  secondaryCard: {
    width: '48%',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  secondaryLabel: {
    fontSize: 12,
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  secondaryValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginTop: 4,
  },
  formRow: {
    flexDirection: 'row',
    marginTop: 10,
  },
  formChip: {
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#E5E7EB',
  },
  formChipSpacing: {
    marginRight: 6,
  },
  formChipWin: {
    backgroundColor: '#34D399',
  },
  formChipLoss: {
    backgroundColor: '#F87171',
  },
  formChipNeutral: {
    backgroundColor: '#E5E7EB',
  },
  formChipText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  formChipTextNeutral: {
    color: '#111827',
  },
  recordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 18,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
  },
  recordIcon: {
    marginRight: 8,
  },
  recordText: {
    fontSize: 13,
    color: '#374151',
  },
  leaderboard: {
    marginTop: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 16,
    padding: 16,
  },
  leaderboardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  leaderboardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  leaderboardSubtitle: {
    fontSize: 12,
    color: '#6B7280',
  },
  leaderboardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    paddingHorizontal: 12,
  },
  leaderboardRowActive: {
    backgroundColor: '#DCFCE7',
  },
  leaderboardRowDivider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E7EB',
  },
  leaderboardRank: {
    width: 28,
  },
  leaderboardRankText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#059669',
  },
  leaderboardInfo: {
    flex: 1,
  },
  leaderboardName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  leaderboardHandle: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  leaderboardScore: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  emptyState: {
    marginTop: 20,
    padding: 20,
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 16,
  },
  emptyIcon: {
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 13,
    color: '#4B5563',
    textAlign: 'center',
  },
});
