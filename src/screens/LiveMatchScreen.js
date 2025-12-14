import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  AppState,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useMatches, usePlayers } from '../hooks/useResources';
import { COLORS, MATCH_TYPES, VENUE_TYPES } from '../config/constants';
import { formatDateTime } from '../utils/helpers';

const LiveMatchScreen = ({ route, navigation }) => {
  const { matchId } = route.params;
  const { matches, loading: matchesLoading, updateMatch } = useMatches(null);
  const { players, loading: playersLoading } = usePlayers(null);
  
  const [match, setMatch] = useState(null);
  const [goalsFor, setGoalsFor] = useState(0);
  const [goalsAgainst, setGoalsAgainst] = useState(0);
  const [playerStats, setPlayerStats] = useState({});
  
  // Timer and substitution tracking
  const [matchSeconds, setMatchSeconds] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [timerStartTime, setTimerStartTime] = useState(null); // Track when timer was started
  const [accumulatedSeconds, setAccumulatedSeconds] = useState(0); // Track seconds before current run
  const [playingPlayers, setPlayingPlayers] = useState(new Set());
  const [playerPeriods, setPlayerPeriods] = useState({}); // Track playing periods
  const timerRef = useRef(null);
  
  const loading = matchesLoading || playersLoading;

  useEffect(() => {
    const foundMatch = matches.find(m => m.id === matchId);
    if (foundMatch) {
      setMatch(foundMatch);
      setGoalsFor(foundMatch.goalsFor || 0);
      setGoalsAgainst(foundMatch.goalsAgainst || 0);
      
      // Initialize player stats
      const stats = {};
      const periods = {};
      if (foundMatch.playerStats && foundMatch.playerStats.length > 0) {
        foundMatch.playerStats.forEach(stat => {
          stats[stat.playerId] = {
            goals: stat.goals || 0,
            assists: stat.assists || 0,
            yellowCards: stat.yellowCards || 0,
            redCard: stat.redCard || false,
          };
          // Initialize periods from saved data if available
          periods[stat.playerId] = stat.playingPeriods || [];
        });
      } else if (foundMatch.selectedPlayerIds) {
        // Initialize empty stats for selected players
        foundMatch.selectedPlayerIds.forEach(playerId => {
          stats[playerId] = { goals: 0, assists: 0, yellowCards: 0, redCard: false };
          periods[playerId] = [];
        });
      }
      setPlayerStats(stats);
      setPlayerPeriods(periods);
    }
  }, [matchId, matches]);

  // Timer effect - uses actual elapsed time instead of intervals for accuracy
  useEffect(() => {
    // Clear any existing interval first
    if (timerRef.current) {
      console.log('⏱️ Clearing existing timer interval');
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    if (isTimerRunning) {
      console.log('▶️ Starting timer interval');
      
      // Record when timer started
      if (!timerStartTime) {
        setTimerStartTime(Date.now());
      }
      
      let lastLoggedSecond = -1; // Track last logged second to avoid duplicate logs
      let lastUpdateSecond = -1; // Track last updated second to avoid unnecessary state updates
      
      // Update timer based on actual elapsed time
      timerRef.current = setInterval(() => {
        const now = Date.now();
        const elapsedSeconds = Math.floor((now - timerStartTime) / 1000);
        const totalSeconds = accumulatedSeconds + elapsedSeconds;
        
        // Only update state when seconds actually change
        if (totalSeconds !== lastUpdateSecond) {
          setMatchSeconds(totalSeconds);
          lastUpdateSecond = totalSeconds;
        }
        
        // Log every 10 seconds to verify timing (only once per second)
        if (totalSeconds % 10 === 0 && totalSeconds > 0 && totalSeconds !== lastLoggedSecond) {
          console.log(`⏱️ Timer at ${totalSeconds} seconds (elapsed: ${elapsedSeconds}s)`);
          lastLoggedSecond = totalSeconds;
        }
      }, 100); // Check every 100ms for smooth updates
    } else {
      console.log('⏸️ Timer paused');
    }

    // Cleanup function
    return () => {
      if (timerRef.current) {
        console.log('🧹 Cleanup: clearing timer interval');
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [isTimerRunning, timerStartTime, accumulatedSeconds]);

  // AppState listener to handle backgrounding
  useEffect(() => {
    const subscription = AppState.addEventListener('change', nextAppState => {
      if (nextAppState === 'active') {
        console.log('📱 App returned to foreground');
        // Timer will automatically recalculate from timestamp
      } else if (nextAppState === 'background') {
        console.log('📱 App went to background - timer continues via timestamps');
      }
    });

    return () => {
      subscription.remove();
    };
  }, []);

  const toggleTimer = () => {
    if (isTimerRunning) {
      // Pausing: accumulate elapsed time
      if (timerStartTime) {
        const elapsed = Math.floor((Date.now() - timerStartTime) / 1000);
        setAccumulatedSeconds(prev => prev + elapsed);
        console.log(`⏸️ Pausing timer - accumulated ${elapsed}s, total: ${accumulatedSeconds + elapsed}s`);
      }
      setTimerStartTime(null);
    } else {
      // Starting: set new start time
      setTimerStartTime(Date.now());
      console.log(`▶️ Starting timer from ${accumulatedSeconds}s`);
    }
    setIsTimerRunning(!isTimerRunning);
  };

  const adjustMatchTime = (seconds) => {
    // Adjust the accumulated seconds (works whether timer is running or paused)
    if (isTimerRunning && timerStartTime) {
      // If running, calculate current elapsed and add adjustment to accumulated
      const currentElapsed = Math.floor((Date.now() - timerStartTime) / 1000);
      const newAccumulated = Math.max(0, accumulatedSeconds + currentElapsed + seconds);
      setAccumulatedSeconds(newAccumulated);
      setTimerStartTime(Date.now()); // Reset start time to now
    } else {
      // If paused, just adjust accumulated seconds
      setAccumulatedSeconds(prev => Math.max(0, prev + seconds));
      setMatchSeconds(prev => Math.max(0, prev + seconds));
    }
  };

  const formatTime = (totalSeconds) => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  };

  const calculateMinutesPlayed = (playerId) => {
    const periods = playerPeriods[playerId] || [];
    let totalSeconds = 0;
    
    periods.forEach(period => {
      if (period.end !== null) {
        totalSeconds += period.end - period.start;
      } else {
        // Currently playing - add time up to current second
        totalSeconds += matchSeconds - period.start;
      }
    });
    
    // Convert to minutes and round
    return Math.floor(totalSeconds / 60);
  };

  const togglePlayerStatus = (playerId) => {
    const isPlaying = playingPlayers.has(playerId);
    
    if (isPlaying) {
      // Sub player off - end current period
      setPlayingPlayers(prev => {
        const newSet = new Set(prev);
        newSet.delete(playerId);
        return newSet;
      });
      
      setPlayerPeriods(prev => {
        const periods = [...(prev[playerId] || [])];
        const lastPeriod = periods[periods.length - 1];
        if (lastPeriod && lastPeriod.end === null) {
          lastPeriod.end = matchSeconds;
        }
        return {
          ...prev,
          [playerId]: periods,
        };
      });
    } else {
      // Sub player on - start new period
      setPlayingPlayers(prev => new Set([...prev, playerId]));
      
      setPlayerPeriods(prev => ({
        ...prev,
        [playerId]: [
          ...(prev[playerId] || []),
          { start: matchSeconds, end: null },
        ],
      }));
    }
  };

  const startAllPlayers = () => {
    const selectedPlayerIds = match?.selectedPlayerIds || [];
    selectedPlayerIds.forEach(playerId => {
      if (!playingPlayers.has(playerId)) {
        setPlayingPlayers(prev => new Set([...prev, playerId]));
        setPlayerPeriods(prev => ({
          ...prev,
          [playerId]: [
            ...(prev[playerId] || []),
            { start: matchSeconds, end: null },
          ],
        }));
      }
    });
  };

  const updateScore = (team, delta) => {
    if (team === 'for') {
      const newScore = Math.max(0, goalsFor + delta);
      setGoalsFor(newScore);
    } else {
      const newScore = Math.max(0, goalsAgainst + delta);
      setGoalsAgainst(newScore);
    }
  };

  const updatePlayerGoals = (playerId, delta) => {
    setPlayerStats(prev => {
      const currentGoals = prev[playerId]?.goals || 0;
      const newGoals = Math.max(0, currentGoals + delta);
      
      // Update team score when player goals change
      if (delta > 0) {
        setGoalsFor(goalsFor + 1);
      } else if (delta < 0 && goalsFor > 0) {
        setGoalsFor(goalsFor - 1);
      }
      
      return {
        ...prev,
        [playerId]: {
          ...prev[playerId],
          goals: newGoals,
        },
      };
    });
  };

  const updatePlayerAssists = (playerId, delta) => {
    setPlayerStats(prev => {
      const currentAssists = prev[playerId]?.assists || 0;
      const newAssists = Math.max(0, currentAssists + delta);
      
      return {
        ...prev,
        [playerId]: {
          ...prev[playerId],
          assists: newAssists,
        },
      };
    });
  };

  const updatePlayerYellowCards = (playerId) => {
    setPlayerStats(prev => {
      const currentYellows = prev[playerId]?.yellowCards || 0;
      const hasRedCard = prev[playerId]?.redCard || false;
      
      // Don't allow yellow cards if player already has a red card
      if (hasRedCard) {
        Alert.alert('Invalid Action', 'Player already has a red card');
        return prev;
      }
      
      // If player already has 2 yellows, don't allow more
      if (currentYellows >= 2) {
        Alert.alert('Invalid Action', 'Player already has 2 yellow cards');
        return prev;
      }
      
      const newYellows = currentYellows + 1;
      
      // If second yellow card, automatically give red card
      if (newYellows === 2) {
        Alert.alert('Red Card!', 'Player receives red card for second yellow');
        return {
          ...prev,
          [playerId]: {
            ...prev[playerId],
            yellowCards: newYellows,
            redCard: true,
          },
        };
      }
      
      return {
        ...prev,
        [playerId]: {
          ...prev[playerId],
          yellowCards: newYellows,
        },
      };
    });
  };

  const updatePlayerRedCard = (playerId) => {
    setPlayerStats(prev => {
      const hasRedCard = prev[playerId]?.redCard || false;
      
      // Don't allow if player already has a red card
      if (hasRedCard) {
        Alert.alert('Invalid Action', 'Player already has a red card');
        return prev;
      }
      
      Alert.alert(
        'Red Card',
        'Give player a direct red card?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Confirm',
            style: 'destructive',
            onPress: () => {
              setPlayerStats(prevStats => ({
                ...prevStats,
                [playerId]: {
                  ...prevStats[playerId],
                  redCard: true,
                },
              }));
            },
          },
        ]
      );
      
      return prev;
    });
  };

  const removePlayerYellowCard = (playerId) => {
    setPlayerStats(prev => {
      const currentYellows = prev[playerId]?.yellowCards || 0;
      const hasRedCard = prev[playerId]?.redCard || false;
      
      if (currentYellows === 0) {
        return prev;
      }
      
      const newYellows = currentYellows - 1;
      
      // If removing a yellow when player has red card from 2 yellows, remove red card too
      if (hasRedCard && currentYellows === 2) {
        Alert.alert('Card Removed', 'Red card removed (was from 2nd yellow)');
        return {
          ...prev,
          [playerId]: {
            ...prev[playerId],
            yellowCards: newYellows,
            redCard: false,
          },
        };
      }
      
      return {
        ...prev,
        [playerId]: {
          ...prev[playerId],
          yellowCards: newYellows,
        },
      };
    });
  };

  const removePlayerRedCard = (playerId) => {
    setPlayerStats(prev => {
      const hasRedCard = prev[playerId]?.redCard || false;
      const currentYellows = prev[playerId]?.yellowCards || 0;
      
      if (!hasRedCard) {
        return prev;
      }
      
      // If red card was from 2 yellows, warn user
      if (currentYellows === 2) {
        Alert.alert(
          'Remove Red Card',
          'This red card was from 2 yellow cards. Remove the red card only or also remove a yellow card?',
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Remove Red Only',
              onPress: () => {
                setPlayerStats(prevStats => ({
                  ...prevStats,
                  [playerId]: {
                    ...prevStats[playerId],
                    redCard: false,
                  },
                }));
              },
            },
            {
              text: 'Remove Red & Yellow',
              onPress: () => {
                setPlayerStats(prevStats => ({
                  ...prevStats,
                  [playerId]: {
                    ...prevStats[playerId],
                    yellowCards: 1,
                    redCard: false,
                  },
                }));
              },
            },
          ]
        );
        return prev;
      }
      
      return {
        ...prev,
        [playerId]: {
          ...prev[playerId],
          redCard: false,
        },
      };
    });
  };

  const handleFinishMatch = async () => {
    // Validate that player goals don't exceed team total
    const totalPlayerGoals = Object.values(playerStats).reduce((sum, stat) => sum + (stat.goals || 0), 0);
    if (totalPlayerGoals > goalsFor) {
      Alert.alert('Validation Error', `Total player goals (${totalPlayerGoals}) cannot exceed team goals (${goalsFor})`);
      return;
    }

    Alert.alert(
      'Finish Match',
      'Save the match result?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Finish',
          onPress: async () => {
            try {
              // End all active playing periods
              const finalPeriods = { ...playerPeriods };
              playingPlayers.forEach(playerId => {
                const periods = finalPeriods[playerId] || [];
                const lastPeriod = periods[periods.length - 1];
                if (lastPeriod && lastPeriod.end === null) {
                  lastPeriod.end = matchSeconds;
                }
              });

              // Prepare player stats array for ALL selected players
              const selectedPlayerIds = match.selectedPlayerIds || [];
              const playerStatsArray = selectedPlayerIds.map(playerId => {
                const stats = playerStats[playerId] || { goals: 0, assists: 0, yellowCards: 0, redCard: false };
                const periods = finalPeriods[playerId] || [];
                const totalSeconds = periods.reduce((total, period) => {
                  return total + ((period.end || matchSeconds) - period.start);
                }, 0);
                const minutesPlayed = Math.floor(totalSeconds / 60);

                return {
                  playerId,
                  goals: stats.goals || 0,
                  assists: stats.assists || 0,
                  minutesPlayed,
                  playingPeriods: periods,
                  yellowCards: stats.yellowCards || 0,
                  redCard: stats.redCard || false,
                };
              });

              await updateMatch(matchId, {
                goalsFor,
                goalsAgainst,
                isFinished: true,
                playerStats: playerStatsArray,
              });
              
              Alert.alert('Success', 'Match finished successfully', [
                {
                  text: 'OK',
                  onPress: () => navigation.navigate('Main', { screen: 'Home' }),
                },
              ]);
            } catch (error) {
              Alert.alert('Error', error.message || 'Failed to finish match');
            }
          },
        },
      ]
    );
  };

  if (loading || !match) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading match...</Text>
      </View>
    );
  }

  const selectedPlayers = match.selectedPlayerIds
    ? match.selectedPlayerIds
        .map(id => players.find(p => p.id === id))
        .filter(Boolean)
    : [];

  return (
    <View style={styles.container}>
      <ScrollView style={styles.content}>
        {/* Match Header */}
        <View style={styles.header}>
          <View style={styles.matchInfo}>
            <View style={styles.badges}>
              <View style={styles.badge}>
                {match.matchType === MATCH_TYPES.CUP ? (
                  <View style={styles.badgeContent}>
                    <Ionicons name="trophy" size={14} color="#FFD700" />
                    <Text style={styles.badgeText}>Cup</Text>
                  </View>
                ) : (
                  <View style={styles.badgeContent}>
                    <Ionicons name="football" size={14} color={COLORS.primary} />
                    <Text style={styles.badgeText}>League</Text>
                  </View>
                )}
              </View>
              <View style={styles.badge}>
                <View style={styles.badgeContent}>
                  <Ionicons 
                    name={match.venue === VENUE_TYPES.HOME ? "home" : "airplane"} 
                    size={14} 
                    color={COLORS.textSecondary} 
                  />
                  <Text style={styles.badgeText}>
                    {match.venue === VENUE_TYPES.HOME ? 'Home' : 'Away'}
                  </Text>
                </View>
              </View>
            </View>
            <Text style={styles.opponent}>vs {match.opponent}</Text>
            <Text style={styles.date}>{formatDateTime(match.date)}</Text>
          </View>
        </View>

        {/* Score Section */}
        <View style={styles.scoreCard}>
          <Text style={styles.scoreTitle}>Match Score</Text>
          <View style={styles.scoreContainer}>
            {/* Your Team Score */}
            <View style={styles.teamScore}>
              <Text style={styles.teamLabel}>Your Team</Text>
              <View style={styles.scoreControls}>
                <TouchableOpacity
                  style={styles.scoreButton}
                  onPress={() => updateScore('for', -1)}
                >
                  <Ionicons name="remove-circle" size={32} color={COLORS.error} />
                </TouchableOpacity>
                <Text style={styles.scoreValue}>{goalsFor}</Text>
                <TouchableOpacity
                  style={styles.scoreButton}
                  onPress={() => updateScore('for', 1)}
                >
                  <Ionicons name="add-circle" size={32} color={COLORS.success} />
                </TouchableOpacity>
              </View>
            </View>

            <Text style={styles.scoreSeparator}>-</Text>

            {/* Opponent Score */}
            <View style={styles.teamScore}>
              <Text style={styles.teamLabel}>{match.opponent}</Text>
              <View style={styles.scoreControls}>
                <TouchableOpacity
                  style={styles.scoreButton}
                  onPress={() => updateScore('against', -1)}
                >
                  <Ionicons name="remove-circle" size={32} color={COLORS.error} />
                </TouchableOpacity>
                <Text style={styles.scoreValue}>{goalsAgainst}</Text>
                <TouchableOpacity
                  style={styles.scoreButton}
                  onPress={() => updateScore('against', 1)}
                >
                  <Ionicons name="add-circle" size={32} color={COLORS.success} />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>

        {/* Match Timer */}
        <View style={styles.timerCard}>
          <View style={styles.timerHeader}>
            <Text style={styles.timerTitle}>Match Timer</Text>
            <TouchableOpacity
              style={[styles.timerButton, isTimerRunning && styles.timerButtonActive]}
              onPress={toggleTimer}
            >
              <Ionicons 
                name={isTimerRunning ? "pause" : "play"} 
                size={20} 
                color="#fff" 
              />
              <Text style={styles.timerButtonText}>
                {isTimerRunning ? "Pause" : "Start"}
              </Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.timerDisplay}>
            <View style={styles.timerAdjustColumn}>
              <TouchableOpacity
                style={styles.timerAdjustButton}
                onPress={() => adjustMatchTime(60)}
              >
                <Ionicons name="add-circle" size={24} color={COLORS.success} />
                <Text style={styles.timerAdjustLabel}>+1 min</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.timerAdjustButton}
                onPress={() => adjustMatchTime(-60)}
              >
                <Ionicons name="remove-circle" size={24} color={COLORS.error} />
                <Text style={styles.timerAdjustLabel}>-1 min</Text>
              </TouchableOpacity>
            </View>
            
            <View style={styles.timerValue}>
              <Text style={styles.timerTime}>{formatTime(matchSeconds)}</Text>
            </View>
            
            <View style={styles.timerAdjustColumn}>
              <TouchableOpacity
                style={styles.timerAdjustButton}
                onPress={() => adjustMatchTime(1)}
              >
                <Ionicons name="add-circle" size={24} color={COLORS.success} />
                <Text style={styles.timerAdjustLabel}>+1 sec</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.timerAdjustButton}
                onPress={() => adjustMatchTime(-1)}
              >
                <Ionicons name="remove-circle" size={24} color={COLORS.error} />
                <Text style={styles.timerAdjustLabel}>-1 sec</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Player Stats */}
        {selectedPlayers.length > 0 && (
          <>
            {/* Start All Players Button */}
            {playingPlayers.size === 0 && (
              <TouchableOpacity
                style={styles.startAllButton}
                onPress={startAllPlayers}
              >
                <Ionicons name="play-circle" size={24} color="#fff" />
                <Text style={styles.startAllText}>Start All Players</Text>
              </TouchableOpacity>
            )}

            {/* Playing Players */}
            {playingPlayers.size > 0 && (
              <View style={styles.playersCard}>
                <View style={styles.sectionHeader}>
                  <View style={[styles.statusIndicator, styles.statusPlaying]} />
                  <Text style={styles.sectionTitle}>PLAYING ({playingPlayers.size})</Text>
                </View>
                
                {selectedPlayers
                  .filter(player => playingPlayers.has(player.id))
                  .map(player => {
                    const stats = playerStats[player.id] || { goals: 0, assists: 0, yellowCards: 0, redCard: false };
                    const minutes = calculateMinutesPlayed(player.id);
                    return (
                      <View key={player.id} style={styles.playerRow}>
                        {/* First Line: Name, Minutes, Cards, Goals, Assists */}
                        <View style={styles.playerFirstLine}>
                          <Text style={styles.playerName}>{player.name}</Text>
                          <View style={styles.playerStatsInline}>
                            <Text style={styles.minutesPlayedInline}>{minutes}'</Text>
                            {stats.yellowCards > 0 && (
                              <View style={styles.cardBadgeInline}>
                                <Text style={styles.yellowCardText}>Y{stats.yellowCards > 1 ? stats.yellowCards : ''}</Text>
                              </View>
                            )}
                            {stats.redCard && (
                              <View style={[styles.cardBadgeInline, styles.redCardBadge]}>
                                <Text style={styles.redCardText}>R</Text>
                              </View>
                            )}
                            <Text style={styles.statInlineText}>⚽ {stats.goals}</Text>
                            <Text style={styles.statInlineText}>⚡ {stats.assists}</Text>
                          </View>
                        </View>

                        {/* Second Line: Controls */}
                        <View style={styles.playerSecondLine}>
                          {/* Goals Control */}
                          <View style={styles.statControl}>
                            <TouchableOpacity
                              style={styles.statButton}
                              onPress={() => updatePlayerGoals(player.id, -1)}
                            >
                              <Ionicons name="remove" size={18} color={COLORS.error} />
                            </TouchableOpacity>
                            <View style={styles.statBadge}>
                              <Ionicons name="football" size={14} color={COLORS.primary} />
                              <Text style={styles.statValue}>{stats.goals}</Text>
                            </View>
                            <TouchableOpacity
                              style={styles.statButton}
                              onPress={() => updatePlayerGoals(player.id, 1)}
                            >
                              <Ionicons name="add" size={18} color={COLORS.success} />
                            </TouchableOpacity>
                          </View>

                          {/* Assists Control */}
                          <View style={styles.statControl}>
                            <TouchableOpacity
                              style={styles.statButton}
                              onPress={() => updatePlayerAssists(player.id, -1)}
                            >
                              <Ionicons name="remove" size={18} color={COLORS.error} />
                            </TouchableOpacity>
                            <View style={styles.statBadge}>
                              <Ionicons name="flash" size={14} color="#FFA500" />
                              <Text style={styles.statValue}>{stats.assists}</Text>
                            </View>
                            <TouchableOpacity
                              style={styles.statButton}
                              onPress={() => updatePlayerAssists(player.id, 1)}
                            >
                              <Ionicons name="add" size={18} color={COLORS.success} />
                            </TouchableOpacity>
                          </View>

                          {/* Yellow Card Button */}
                          <TouchableOpacity
                            style={[styles.cardButton, styles.yellowCardButton]}
                            onPress={() => updatePlayerYellowCards(player.id)}
                            onLongPress={() => removePlayerYellowCard(player.id)}
                          >
                            <View style={styles.yellowCardIcon} />
                          </TouchableOpacity>

                          {/* Red Card Button */}
                          <TouchableOpacity
                            style={[styles.cardButton, styles.redCardButton]}
                            onPress={() => updatePlayerRedCard(player.id)}
                            onLongPress={() => removePlayerRedCard(player.id)}
                          >
                            <View style={styles.redCardIcon} />
                          </TouchableOpacity>

                          {/* Sub Off Button */}
                          <TouchableOpacity
                            style={[styles.subButton, styles.subOffButton]}
                            onPress={() => togglePlayerStatus(player.id)}
                          >
                            <Ionicons name="swap-horizontal" size={20} color="#fff" />
                          </TouchableOpacity>
                        </View>
                      </View>
                    );
                  })}
              </View>
            )}

            {/* Bench Players */}
            {selectedPlayers.filter(player => !playingPlayers.has(player.id)).length > 0 && (
              <View style={styles.playersCard}>
                <View style={styles.sectionHeader}>
                  <View style={[styles.statusIndicator, styles.statusBench]} />
                  <Text style={styles.sectionTitle}>
                    ON BENCH ({selectedPlayers.filter(p => !playingPlayers.has(p.id)).length})
                  </Text>
                </View>
                
                {selectedPlayers
                  .filter(player => !playingPlayers.has(player.id))
                  .map(player => {
                    const stats = playerStats[player.id] || { goals: 0, assists: 0, yellowCards: 0, redCard: false };
                    const minutes = calculateMinutesPlayed(player.id);
                    return (
                      <View key={player.id} style={styles.playerRow}>
                        {/* First Line: Name, Minutes, Cards, Goals, Assists */}
                        <View style={styles.playerFirstLine}>
                          <Text style={styles.playerName}>{player.name}</Text>
                          <View style={styles.playerStatsInline}>
                            <Text style={styles.minutesPlayedInline}>{minutes}'</Text>
                            {stats.yellowCards > 0 && (
                              <View style={styles.cardBadgeInline}>
                                <Text style={styles.yellowCardText}>Y{stats.yellowCards > 1 ? stats.yellowCards : ''}</Text>
                              </View>
                            )}
                            {stats.redCard && (
                              <View style={[styles.cardBadgeInline, styles.redCardBadge]}>
                                <Text style={styles.redCardText}>R</Text>
                              </View>
                            )}
                            <Text style={styles.statInlineText}>⚽ {stats.goals}</Text>
                            <Text style={styles.statInlineText}>⚡ {stats.assists}</Text>
                          </View>
                        </View>

                        {/* Second Line: Controls */}
                        <View style={styles.playerSecondLine}>
                          {/* Goals Control */}
                          <View style={styles.statControl}>
                            <TouchableOpacity
                              style={styles.statButton}
                              onPress={() => updatePlayerGoals(player.id, -1)}
                            >
                              <Ionicons name="remove" size={18} color={COLORS.error} />
                            </TouchableOpacity>
                            <View style={styles.statBadge}>
                              <Ionicons name="football" size={14} color={COLORS.primary} />
                              <Text style={styles.statValue}>{stats.goals}</Text>
                            </View>
                            <TouchableOpacity
                              style={styles.statButton}
                              onPress={() => updatePlayerGoals(player.id, 1)}
                            >
                              <Ionicons name="add" size={18} color={COLORS.success} />
                            </TouchableOpacity>
                          </View>

                          {/* Assists Control */}
                          <View style={styles.statControl}>
                            <TouchableOpacity
                              style={styles.statButton}
                              onPress={() => updatePlayerAssists(player.id, -1)}
                            >
                              <Ionicons name="remove" size={18} color={COLORS.error} />
                            </TouchableOpacity>
                            <View style={styles.statBadge}>
                              <Ionicons name="flash" size={14} color="#FFA500" />
                              <Text style={styles.statValue}>{stats.assists}</Text>
                            </View>
                            <TouchableOpacity
                              style={styles.statButton}
                              onPress={() => updatePlayerAssists(player.id, 1)}
                            >
                              <Ionicons name="add" size={18} color={COLORS.success} />
                            </TouchableOpacity>
                          </View>

                          {/* Yellow Card Button */}
                          <TouchableOpacity
                            style={[styles.cardButton, styles.yellowCardButton]}
                            onPress={() => updatePlayerYellowCards(player.id)}
                            onLongPress={() => removePlayerYellowCard(player.id)}
                          >
                            <View style={styles.yellowCardIcon} />
                          </TouchableOpacity>

                          {/* Red Card Button */}
                          <TouchableOpacity
                            style={[styles.cardButton, styles.redCardButton]}
                            onPress={() => updatePlayerRedCard(player.id)}
                            onLongPress={() => removePlayerRedCard(player.id)}
                          >
                            <View style={styles.redCardIcon} />
                          </TouchableOpacity>

                          {/* Sub On Button */}
                          <TouchableOpacity
                            style={[styles.subButton, styles.subOnButton]}
                            onPress={() => togglePlayerStatus(player.id)}
                          >
                            <Ionicons name="swap-horizontal" size={20} color="#fff" />
                          </TouchableOpacity>
                        </View>
                      </View>
                    );
                  })}
              </View>
            )}
          </>
        )}

        {/* Finish Match Button */}
        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.finishButton}
            onPress={handleFinishMatch}
          >
            <Ionicons name="checkmark-circle" size={24} color="#fff" />
            <Text style={styles.finishButtonText}>Finish Match</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: COLORS.textSecondary,
  },
  content: {
    flex: 1,
  },
  header: {
    backgroundColor: COLORS.primary,
    padding: 20,
    paddingTop: 50,
  },
  matchInfo: {
    alignItems: 'center',
  },
  badges: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 1)',
  },
  badgeContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.primary,
  },
  opponent: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 5,
  },
  date: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  scoreCard: {
    backgroundColor: '#fff',
    margin: 15,
    padding: 20,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  scoreTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 20,
    textAlign: 'center',
  },
  scoreContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  teamScore: {
    alignItems: 'center',
    flex: 1,
  },
  teamLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: 15,
  },
  scoreControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
  },
  scoreButton: {
    padding: 5,
  },
  scoreValue: {
    fontSize: 48,
    fontWeight: 'bold',
    color: COLORS.text,
    minWidth: 60,
    textAlign: 'center',
  },
  scoreSeparator: {
    fontSize: 36,
    fontWeight: 'bold',
    color: COLORS.textSecondary,
    marginHorizontal: 10,
  },
  playersCard: {
    backgroundColor: '#fff',
    marginHorizontal: 15,
    marginBottom: 15,
    padding: 20,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  playersTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 15,
  },
  playerRow: {
    flexDirection: 'column',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray[100],
    gap: 10,
  },
  playerFirstLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  playerSecondLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  playerName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    flex: 1,
  },
  playerStatsInline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  minutesPlayedInline: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
  },
  cardBadgeInline: {
    backgroundColor: '#FFD700',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    minWidth: 20,
    alignItems: 'center',
  },
  statInlineText: {
    fontSize: 13,
    fontWeight: '500',
    color: COLORS.textSecondary,
  },
  playerInfo: {
    flex: 1,
  },
  playerNameRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  playerBadges: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  cardBadge: {
    backgroundColor: '#FFD700',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    minWidth: 20,
    alignItems: 'center',
  },
  redCardBadge: {
    backgroundColor: '#DC143C',
  },
  yellowCardText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#000',
  },
  redCardText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#fff',
  },
  minutesPlayed: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
    marginLeft: 10,
  },
  playerStatsText: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  playerActionsColumn: {
    gap: 10,
    alignItems: 'flex-end',
  },
  subButton: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 72,
    height: 36,
    borderRadius: 8,
  },
  subOnButton: {
    backgroundColor: COLORS.success,
  },
  subOffButton: {
    backgroundColor: COLORS.error,
  },
  statControlsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  statControl: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statButton: {
    padding: 4,
  },
  statBadge: {
    backgroundColor: COLORS.gray[100],
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    minWidth: 50,
    justifyContent: 'center',
  },
  statValue: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  cardControlsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  cardButton: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 32,
    height: 32,
    borderRadius: 6,
  },
  yellowCardButton: {
    backgroundColor: '#FFD700',
  },
  redCardButton: {
    backgroundColor: '#DC143C',
  },
  yellowCardIcon: {
    width: 12,
    height: 16,
    backgroundColor: '#FFD700',
    borderRadius: 2,
    borderWidth: 1,
    borderColor: '#000',
  },
  redCardIcon: {
    width: 12,
    height: 16,
    backgroundColor: '#DC143C',
    borderRadius: 2,
    borderWidth: 1,
    borderColor: '#8B0000',
  },
  cardButtonText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#000',
  },
  actions: {
    padding: 15,
    paddingBottom: 30,
  },
  finishButton: {
    backgroundColor: COLORS.success,
    padding: 18,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  finishButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  // Timer styles
  timerCard: {
    backgroundColor: '#fff',
    marginHorizontal: 15,
    marginBottom: 15,
    padding: 20,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  timerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  timerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  timerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  timerButtonActive: {
    backgroundColor: COLORS.warning,
  },
  timerButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  timerDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 15,
  },
  timerAdjustColumn: {
    gap: 10,
    alignItems: 'center',
  },
  timerAdjustButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    padding: 6,
  },
  timerAdjustLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  timerValue: {
    alignItems: 'center',
    flex: 1,
  },
  timerTime: {
    fontSize: 42,
    fontWeight: 'bold',
    color: COLORS.primary,
    fontVariant: ['tabular-nums'],
  },
  timerLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  // Player section styles
  startAllButton: {
    backgroundColor: COLORS.success,
    marginHorizontal: 15,
    marginBottom: 15,
    padding: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  startAllText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  statusIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  statusPlaying: {
    backgroundColor: COLORS.success,
  },
  statusBench: {
    backgroundColor: COLORS.textSecondary,
  },
});

export default LiveMatchScreen;
