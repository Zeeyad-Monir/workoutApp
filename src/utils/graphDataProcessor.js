export const processSubmissionsForGraph = (submissions, competition, users) => {
  const startDate = new Date(competition.startDate);
  const endDate = new Date(competition.endDate);
  
  // Determine tick mode based on competition settings
  const tickMode = competition.leaderboardUpdateSchedule === 'daily' ? 'day' : 'window';
  
  // Generate tick dates based on mode
  const ticks = generateTicks(startDate, endDate, tickMode, competition);
  
  // Group submissions by user and tick
  const userSubmissionsByTick = {};
  
  // Initialize data structure for each participant
  competition.participants.forEach(userId => {
    userSubmissionsByTick[userId] = {};
    ticks.forEach(tick => {
      userSubmissionsByTick[userId][tick.isoString] = 0;
    });
  });
  
  // Process each submission
  submissions.forEach(submission => {
    const submissionDate = submission.createdAt?.toDate ? submission.createdAt.toDate() : new Date(submission.createdAt);
    const tickDate = findClosestTick(submissionDate, ticks);
    
    if (tickDate && userSubmissionsByTick[submission.userId]) {
      userSubmissionsByTick[submission.userId][tickDate.isoString] += submission.points || 0;
    }
  });
  
  // Convert to cumulative points and format for chart
  const series = competition.participants.map(userId => {
    const userName = users[userId]?.username || 'Unknown User';
    const colorHex = getUserColor(userId);
    
    let cumulativePoints = 0;
    const points = ticks.map(tick => {
      // Add current tick's points to cumulative
      cumulativePoints += userSubmissionsByTick[userId][tick.isoString] || 0;
      
      return {
        t: tick.isoString,
        cumulative: cumulativePoints
      };
    });
    
    return {
      userId,
      displayName: userName,
      colorHex,
      points
    };
  });
  
  return {
    startAt: startDate.toISOString(),
    endAt: endDate.toISOString(),
    tickMode,
    series,
    ticks: ticks.map(t => t.label)
  };
};

const generateTicks = (startDate, endDate, tickMode, competition) => {
  const ticks = [];
  const current = new Date(startDate);
  
  if (tickMode === 'day') {
    // Daily ticks
    while (current <= endDate) {
      ticks.push({
        isoString: current.toISOString(),
        label: formatDateLabel(current, 'day'),
        date: new Date(current)
      });
      current.setDate(current.getDate() + 1);
    }
  } else {
    // Window-based ticks (submission windows)
    // This would need to be adjusted based on your actual submission window logic
    const windowHours = competition.submissionWindowHours || 24;
    while (current <= endDate) {
      ticks.push({
        isoString: current.toISOString(),
        label: formatDateLabel(current, 'window'),
        date: new Date(current)
      });
      current.setHours(current.getHours() + windowHours);
    }
  }
  
  return ticks;
};

const findClosestTick = (date, ticks) => {
  let closest = null;
  let minDiff = Infinity;
  
  ticks.forEach(tick => {
    const diff = Math.abs(date - tick.date);
    if (diff < minDiff && date >= tick.date) {
      minDiff = diff;
      closest = tick;
    }
  });
  
  return closest;
};

const formatDateLabel = (date, mode) => {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  
  if (mode === 'day') {
    // Format: "Jan 5"
    return `${months[date.getMonth()]} ${date.getDate()}`;
  } else {
    // Format: "2 PM • Jan 5"
    const hours = date.getHours();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const hour12 = hours % 12 || 12;
    return `${hour12} ${ampm} • ${months[date.getMonth()]} ${date.getDate()}`;
  }
};

// Deterministic color palette for users
const colorPalette = [
  '#FF6B6B', // Red
  '#4ECDC4', // Teal
  '#45B7D1', // Blue
  '#FFA07A', // Light Salmon
  '#98D8C8', // Mint
  '#FFD93D', // Yellow
  '#6C88C4', // Purple Blue
  '#FF8CC6', // Pink
  '#7FCD91', // Green
  '#FDB869', // Orange
];

const getUserColor = (userId) => {
  // Create a simple hash from userId to get consistent color
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = userId.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % colorPalette.length;
  return colorPalette[index];
};

export default {
  processSubmissionsForGraph,
  getUserColor
};