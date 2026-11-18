import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { Header } from '../../components/ui/Header';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { db } from '../../services/db';
import { formatVND, formatDateVN } from '../../utils/format';
import { RADIUS, SPACING, SHADOWS } from '../../constants/theme';

export default function TournamentDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { user } = useAuth();
  const { colors } = useTheme();

  const [tournament, setTournament] = useState(null);
  const [activeTab, setActiveTab] = useState('info'); // 'info' | 'teams' | 'matches' | 'standings'
  const [registerModalVisible, setRegisterModalVisible] = useState(false);

  // Register Form State
  const [teamName, setTeamName] = useState('');
  const [captainName, setCaptainName] = useState(user?.fullName || '');
  const [captainPhone, setCaptainPhone] = useState(user?.phone || '');
  const [memberCount, setMemberCount] = useState('7');
  const [registering, setRegistering] = useState(false);

  useEffect(() => {
    loadTournament();
  }, [id]);

  const loadTournament = async () => {
    try {
      const data = await db.getById('tournaments', id);
      setTournament(data);
    } catch (e) {
      console.warn('Lỗi tải thông tin giải đấu:', e);
    }
  };

  const handleRegisterTeam = async () => {
    if (!teamName.trim()) {
      Alert.alert('Thiếu thông tin', 'Vui lòng nhập tên đội bóng / đội thi đấu');
      return;
    }
    if (!captainPhone.trim()) {
      Alert.alert('Thiếu thông tin', 'Vui lòng nhập số điện thoại liên hệ của đội trưởng');
      return;
    }

    setRegistering(true);
    try {
      const newTeam = {
        id: `tm_${Date.now()}`,
        name: teamName.trim(),
        captain: captainName.trim(),
        phone: captainPhone.trim(),
        memberCount: parseInt(memberCount, 10) || 5,
        status: 'approved',
        createdAt: new Date().toISOString(),
      };

      const updatedTeams = [...(tournament.teams || []), newTeam];

      // Thêm vào bảng xếp hạng nếu chưa có
      const updatedStandings = [
        ...(tournament.standings || []),
        { team: teamName.trim(), played: 0, won: 0, drawn: 0, lost: 0, points: 0 },
      ];

      await db.update('tournaments', id, {
        teams: updatedTeams,
        standings: updatedStandings,
      });

      setRegisterModalVisible(false);
      setTeamName('');
      Alert.alert(
        'Đăng ký thành công! 🏆',
        `Đội "${newTeam.name}" đã được ghi danh vào giải đấu. Ban tổ chức sẽ liên hệ qua SĐT ${newTeam.phone} để hướng dẫn bốc thăm.`
      );
      await loadTournament();
    } catch (e) {
      Alert.alert('Lỗi', 'Không thể hoàn tất đăng ký đội');
    } finally {
      setRegistering(false);
    }
  };

  if (!tournament) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <Header title="Chi tiết giải đấu" showBack onBack={() => router.back()} />
        <View style={styles.centerContainer}>
          <Text style={{ color: colors.textSecondary }}>Đang tải thông tin giải đấu...</Text>
        </View>
      </View>
    );
  }

  const teams = tournament.teams || [];
  const matches = tournament.matches || [];
  const standings = tournament.standings || [];

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Header title="Chi tiết giải đấu" showBack onBack={() => router.back()} />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
        {/* Cover Image */}
        <Image source={{ uri: tournament.cover }} style={styles.coverImage} />

        {/* Header Title & Prize Banner */}
        <View style={[styles.mainCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.topBadgeRow}>
            <Badge label={tournament.sport?.toUpperCase() || 'THỂ THAO'} variant="accent" />
            <Badge
              label={
                tournament.status === 'open'
                  ? 'Đang mở đăng ký'
                  : tournament.status === 'ongoing'
                  ? 'Đang diễn ra'
                  : 'Đã kết thúc'
              }
              variant={
                tournament.status === 'open'
                  ? 'success'
                  : tournament.status === 'ongoing'
                  ? 'warning'
                  : 'neutral'
              }
            />
          </View>

          <Text style={[styles.tourTitle, { color: colors.text }]}>{tournament.name}</Text>

          {/* Prize Box */}
          <View style={[styles.prizeBox, { backgroundColor: colors.warningLight }]}>
            <Ionicons name="trophy" size={24} color="#D97706" />
            <View style={{ marginLeft: 10 }}>
              <Text style={styles.prizeLabel}>TỔNG GIẢI THƯỞNG</Text>
              <Text style={styles.prizeAmount}>{tournament.prize}</Text>
            </View>
          </View>

          {/* Meta Info Grid */}
          <View style={styles.metaGrid}>
            <View style={styles.metaItem}>
              <Text style={[styles.metaLabel, { color: colors.textSecondary }]}>Lệ phí</Text>
              <Text style={[styles.metaValue, { color: colors.primary }]}>
                {tournament.fee ? formatVND(tournament.fee) : 'Miễn phí'}
              </Text>
            </View>

            <View style={styles.metaItem}>
              <Text style={[styles.metaLabel, { color: colors.textSecondary }]}>Hạn đăng ký</Text>
              <Text style={[styles.metaValue, { color: colors.text }]}>
                {formatDateVN(tournament.registerTo)}
              </Text>
            </View>

            <View style={styles.metaItem}>
              <Text style={[styles.metaLabel, { color: colors.textSecondary }]}>Quy mô</Text>
              <Text style={[styles.metaValue, { color: colors.text }]}>
                {teams.length}/{tournament.maxTeams || 16} đội
              </Text>
            </View>
          </View>
        </View>

        {/* 4 Tabs Bar: Thông tin / Đội tham gia / Lịch thi đấu / Bảng xếp hạng */}
        <View style={[styles.tabBar, { backgroundColor: colors.surfaceSecondary }]}>
          <TouchableOpacity
            style={[styles.tabItem, activeTab === 'info' && [styles.tabActive, { backgroundColor: colors.primary }]]}
            onPress={() => setActiveTab('info')}
          >
            <Text style={[styles.tabText, { color: activeTab === 'info' ? '#FFFFFF' : colors.textSecondary }]}>
              Thể lệ
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabItem, activeTab === 'teams' && [styles.tabActive, { backgroundColor: colors.primary }]]}
            onPress={() => setActiveTab('teams')}
          >
            <Text style={[styles.tabText, { color: activeTab === 'teams' ? '#FFFFFF' : colors.textSecondary }]}>
              Đội ({teams.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabItem, activeTab === 'matches' && [styles.tabActive, { backgroundColor: colors.primary }]]}
            onPress={() => setActiveTab('matches')}
          >
            <Text style={[styles.tabText, { color: activeTab === 'matches' ? '#FFFFFF' : colors.textSecondary }]}>
              Trận đấu
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabItem, activeTab === 'standings' && [styles.tabActive, { backgroundColor: colors.primary }]]}
            onPress={() => setActiveTab('standings')}
          >
            <Text style={[styles.tabText, { color: activeTab === 'standings' ? '#FFFFFF' : colors.textSecondary }]}>
              Bảng điểm
            </Text>
          </TouchableOpacity>
        </View>

        {/* Tab 1: Info & Rules */}
        {activeTab === 'info' && (
          <View style={[styles.contentCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.contentTitle, { color: colors.text }]}>Điều lệ và quy chế thi đấu</Text>
            <Text style={[styles.rulesText, { color: colors.textSecondary }]}>
              {tournament.rules || 'Quy chế thi đấu tuân theo luật chuẩn quốc tế của Liên đoàn Thể thao.'}
            </Text>
          </View>
        )}

        {/* Tab 2: Teams List */}
        {activeTab === 'teams' && (
          <View style={[styles.contentCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.contentTitle, { color: colors.text }]}>Danh sách các đội tham gia</Text>
            {teams.length === 0 ? (
              <Text style={{ color: colors.textSecondary, fontStyle: 'italic' }}>Chưa có đội nào đăng ký.</Text>
            ) : (
              teams.map((t, idx) => (
                <View
                  key={t.id || idx}
                  style={[styles.teamRow, { borderBottomColor: colors.border }]}
                >
                  <View style={[styles.teamNumberCircle, { backgroundColor: colors.surfaceSecondary }]}>
                    <Text style={[styles.teamNumberText, { color: colors.primary }]}>{idx + 1}</Text>
                  </View>
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={[styles.teamName, { color: colors.text }]}>{t.name}</Text>
                    <Text style={[styles.teamCaptain, { color: colors.textSecondary }]}>
                      Đội trưởng: {t.captain} • SĐT: {t.phone}
                    </Text>
                  </View>
                  <Badge label="Đã duyệt" variant="success" size="sm" />
                </View>
              ))
            )}
          </View>
        )}

        {/* Tab 3: Match Schedule */}
        {activeTab === 'matches' && (
          <View style={[styles.contentCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.contentTitle, { color: colors.text }]}>Lịch thi đấu & Kết quả</Text>
            {matches.length === 0 ? (
              <Text style={{ color: colors.textSecondary, fontStyle: 'italic' }}>Lịch thi đấu đang được cập nhật.</Text>
            ) : (
              matches.map((m) => (
                <View
                  key={m.id}
                  style={[styles.matchCard, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border }]}
                >
                  <Text style={[styles.matchRound, { color: colors.primary }]}>{m.round} • {m.court}</Text>
                  <Text style={[styles.matchDate, { color: colors.textMuted }]}>{m.date}</Text>

                  <View style={styles.matchTeamsRow}>
                    <Text style={[styles.matchTeamName, { color: colors.text, textAlign: 'right' }]}>{m.teamA}</Text>
                    <View style={styles.scoreBox}>
                      <Text style={styles.scoreText}>
                        {m.scoreA !== null ? `${m.scoreA} - ${m.scoreB}` : 'VS'}
                      </Text>
                    </View>
                    <Text style={[styles.matchTeamName, { color: colors.text, textAlign: 'left' }]}>{m.teamB}</Text>
                  </View>
                </View>
              ))
            )}
          </View>
        )}

        {/* Tab 4: Standings Table */}
        {activeTab === 'standings' && (
          <View style={[styles.contentCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.contentTitle, { color: colors.text }]}>Bảng xếp hạng điểm số</Text>
            <View style={[styles.standingsHeader, { backgroundColor: colors.surfaceSecondary }]}>
              <Text style={[styles.colRank, { color: colors.textSecondary }]}>#</Text>
              <Text style={[styles.colTeam, { color: colors.textSecondary }]}>Đội thi đấu</Text>
              <Text style={[styles.colStat, { color: colors.textSecondary }]}>Trận</Text>
              <Text style={[styles.colStat, { color: colors.textSecondary }]}>T</Text>
              <Text style={[styles.colStat, { color: colors.textSecondary }]}>H</Text>
              <Text style={[styles.colStat, { color: colors.textSecondary }]}>B</Text>
              <Text style={[styles.colPts, { color: colors.primary }]}>Điểm</Text>
            </View>

            {standings.map((s, idx) => (
              <View key={idx} style={[styles.standingRow, { borderBottomColor: colors.border }]}>
                <Text style={[styles.colRank, { color: idx < 2 ? colors.primary : colors.text }]}>{idx + 1}</Text>
                <Text style={[styles.colTeam, { color: colors.text, fontWeight: '700' }]} numberOfLines={1}>{s.team}</Text>
                <Text style={[styles.colStat, { color: colors.textSecondary }]}>{s.played}</Text>
                <Text style={[styles.colStat, { color: colors.textSecondary }]}>{s.won}</Text>
                <Text style={[styles.colStat, { color: colors.textSecondary }]}>{s.drawn || 0}</Text>
                <Text style={[styles.colStat, { color: colors.textSecondary }]}>{s.lost}</Text>
                <Text style={[styles.colPts, { color: colors.primary, fontWeight: '900' }]}>{s.points}</Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Sticky Bottom Register Button */}
      {tournament.status === 'open' && (
        <View style={[styles.bottomBar, { backgroundColor: colors.surface, borderTopColor: colors.border }, SHADOWS.lg]}>
          <View>
            <Text style={{ fontSize: 11, color: colors.textSecondary }}>Hạn chót đăng ký</Text>
            <Text style={{ fontSize: 14, fontWeight: '800', color: colors.warning }}>
              {formatDateVN(tournament.registerTo)}
            </Text>
          </View>

          <Button
            title="Đăng ký tham gia"
            onPress={() => setRegisterModalVisible(true)}
            variant="accent"
            size="lg"
            icon={<Ionicons name="flag" size={18} color="#0F172A" />}
            style={{ minWidth: 170 }}
          />
        </View>
      )}

      {/* Register Team Modal Form */}
      <Modal visible={registerModalVisible} transparent animationType="slide">
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { backgroundColor: colors.surface }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Đăng ký đội tham gia</Text>
            <Text style={[styles.modalDesc, { color: colors.textSecondary }]}>
              {tournament.name}
            </Text>

            <Text style={[styles.fieldLabel, { color: colors.text }]}>Tên đội bóng / CLB *</Text>
            <TextInput
              style={[
                styles.input,
                { backgroundColor: colors.surfaceSecondary, borderColor: colors.border, color: colors.text },
              ]}
              placeholder="vd: FC Bách Khoa Tân Bình"
              placeholderTextColor={colors.textMuted}
              value={teamName}
              onChangeText={setTeamName}
            />

            <Text style={[styles.fieldLabel, { color: colors.text }]}>Họ tên Đội trưởng *</Text>
            <TextInput
              style={[
                styles.input,
                { backgroundColor: colors.surfaceSecondary, borderColor: colors.border, color: colors.text },
              ]}
              value={captainName}
              onChangeText={setCaptainName}
            />

            <Text style={[styles.fieldLabel, { color: colors.text }]}>Số điện thoại liên hệ *</Text>
            <TextInput
              style={[
                styles.input,
                { backgroundColor: colors.surfaceSecondary, borderColor: colors.border, color: colors.text },
              ]}
              value={captainPhone}
              onChangeText={setCaptainPhone}
              keyboardType="phone-pad"
            />

            <Text style={[styles.fieldLabel, { color: colors.text }]}>Số lượng thành viên</Text>
            <TextInput
              style={[
                styles.input,
                { backgroundColor: colors.surfaceSecondary, borderColor: colors.border, color: colors.text },
              ]}
              value={memberCount}
              onChangeText={setMemberCount}
              keyboardType="number-pad"
            />

            <View style={styles.modalActionButtons}>
              <Button
                title="Hủy"
                onPress={() => setRegisterModalVisible(false)}
                variant="ghost"
                style={{ flex: 1, marginRight: 8 }}
              />
              <Button
                title="Xác nhận gửi"
                onPress={handleRegisterTeam}
                loading={registering}
                variant="primary"
                style={{ flex: 1.5 }}
              />
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  coverImage: {
    width: '100%',
    height: 200,
  },
  mainCard: {
    margin: SPACING.lg,
    padding: SPACING.lg,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    marginTop: -30,
  },
  topBadgeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  tourTitle: {
    fontSize: 18,
    fontWeight: '900',
    marginBottom: 12,
  },
  prizeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: RADIUS.md,
    marginBottom: 14,
  },
  prizeLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#92400E',
  },
  prizeAmount: {
    fontSize: 16,
    fontWeight: '900',
    color: '#78350F',
    marginTop: 2,
  },
  metaGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  metaItem: {
    alignItems: 'center',
  },
  metaLabel: {
    fontSize: 11,
  },
  metaValue: {
    fontSize: 14,
    fontWeight: '800',
    marginTop: 2,
  },
  tabBar: {
    flexDirection: 'row',
    marginHorizontal: SPACING.lg,
    borderRadius: RADIUS.md,
    padding: 3,
    marginBottom: SPACING.md,
  },
  tabItem: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: RADIUS.sm,
  },
  tabActive: {},
  tabText: {
    fontSize: 12,
    fontWeight: '700',
  },
  contentCard: {
    marginHorizontal: SPACING.lg,
    padding: SPACING.lg,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    marginBottom: SPACING.lg,
  },
  contentTitle: {
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 10,
  },
  rulesText: {
    fontSize: 13,
    lineHeight: 20,
  },
  teamRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  teamNumberCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  teamNumberText: {
    fontSize: 12,
    fontWeight: '800',
  },
  teamName: {
    fontSize: 14,
    fontWeight: '800',
  },
  teamCaptain: {
    fontSize: 12,
    marginTop: 2,
  },
  matchCard: {
    padding: 12,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    marginBottom: 10,
  },
  matchRound: {
    fontSize: 12,
    fontWeight: '700',
  },
  matchDate: {
    fontSize: 11,
    marginTop: 2,
    marginBottom: 8,
  },
  matchTeamsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  matchTeamName: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
  },
  scoreBox: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    backgroundColor: '#0F172A',
    borderRadius: RADIUS.xs,
    marginHorizontal: 10,
  },
  scoreText: {
    color: '#A3E635',
    fontWeight: '900',
    fontSize: 13,
  },
  standingsHeader: {
    flexDirection: 'row',
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderRadius: RADIUS.xs,
    marginBottom: 4,
  },
  standingRow: {
    flexDirection: 'row',
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    alignItems: 'center',
  },
  colRank: {
    width: 24,
    fontSize: 12,
    fontWeight: '700',
  },
  colTeam: {
    flex: 1,
    fontSize: 13,
  },
  colStat: {
    width: 32,
    textAlign: 'center',
    fontSize: 12,
  },
  colPts: {
    width: 36,
    textAlign: 'center',
    fontSize: 13,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingVertical: 14,
    borderTopWidth: 1,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.xl,
  },
  modalCard: {
    width: '100%',
    padding: SPACING.xl,
    borderRadius: RADIUS.xl,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '900',
    marginBottom: 2,
  },
  modalDesc: {
    fontSize: 13,
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 4,
  },
  input: {
    borderRadius: RADIUS.md,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    marginBottom: 12,
  },
  modalActionButtons: {
    flexDirection: 'row',
    marginTop: 8,
  },
});
