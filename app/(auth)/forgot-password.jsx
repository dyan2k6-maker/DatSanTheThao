import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Header } from '../../components/ui/Header';
import { RADIUS, SPACING } from '../../constants/theme';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const { colors } = useTheme();

  const [step, setStep] = useState(1); // 1: Email, 2: OTP, 3: New Password
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [demoOtp, setDemoOtp] = useState('123456');
  const [countdown, setCountdown] = useState(60);
  const [canResend, setCanResend] = useState(false);

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Countdown timer cho OTP
  useEffect(() => {
    let timer = null;
    if (step === 2 && countdown > 0) {
      timer = setInterval(() => {
        setCountdown((c) => c - 1);
      }, 1000);
    } else if (countdown === 0) {
      setCanResend(true);
    }
    return () => clearInterval(timer);
  }, [step, countdown]);

  const handleSendEmail = () => {
    if (!email.trim() || !email.includes('@')) {
      setErrorMessage('Vui lòng nhập email hợp lệ');
      return;
    }
    setLoading(true);
    setErrorMessage('');
    setTimeout(() => {
      setLoading(false);
      setDemoOtp('123456');
      setStep(2);
      setCountdown(60);
      setCanResend(false);
    }, 600);
  };

  const handleVerifyOtp = () => {
    if (otp.trim().length !== 6) {
      setErrorMessage('Mã OTP gồm 6 chữ số');
      return;
    }
    if (otp.trim() !== demoOtp) {
      setErrorMessage(`Mã OTP không đúng. (Mã mẫu Demo: ${demoOtp})`);
      return;
    }
    setLoading(true);
    setErrorMessage('');
    setTimeout(() => {
      setLoading(false);
      setStep(3);
    }, 500);
  };

  const handleResetPassword = () => {
    if (!newPassword || newPassword.length < 6) {
      setErrorMessage('Mật khẩu mới phải từ 6 ký tự trở lên');
      return;
    }
    if (newPassword !== confirmPassword) {
      setErrorMessage('Xác nhận mật khẩu không khớp');
      return;
    }
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      Alert.alert(
        'Đổi mật khẩu thành công!',
        'Bạn đã thiết lập mật khẩu mới thành công. Hãy đăng nhập để tiếp tục.',
        [{ text: 'Đăng nhập', onPress: () => router.replace('/(auth)/login') }]
      );
    }, 600);
  };

  const handleResendOtp = () => {
    setCountdown(60);
    setCanResend(false);
    setDemoOtp('654321');
    Alert.alert('Mã OTP mới', 'Mã xác thực mới của bạn là: 654321');
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={{ flex: 1, backgroundColor: colors.background }}
    >
      <Header
        title="Quên mật khẩu"
        showBack
        onBack={() => {
          if (step > 1) {
            setStep(step - 1);
          } else {
            router.back();
          }
        }}
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Step indicator */}
        <View style={styles.stepIndicatorRow}>
          {[1, 2, 3].map((s) => (
            <React.Fragment key={s}>
              <View
                style={[
                  styles.stepBadge,
                  {
                    backgroundColor:
                      step >= s ? colors.primary : colors.surfaceSecondary,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.stepBadgeText,
                    { color: step >= s ? '#FFFFFF' : colors.textSecondary },
                  ]}
                >
                  {s}
                </Text>
              </View>
              {s < 3 && (
                <View
                  style={[
                    styles.stepLine,
                    {
                      backgroundColor:
                        step > s ? colors.primary : colors.border,
                    },
                  ]}
                />
              )}
            </React.Fragment>
          ))}
        </View>

        {errorMessage !== '' && (
          <View style={styles.errorBox}>
            <Ionicons name="alert-circle" size={18} color="#EF4444" />
            <Text style={styles.errorText}>{errorMessage}</Text>
          </View>
        )}

        {/* STEP 1: Enter email */}
        {step === 1 && (
          <View style={[styles.card, { backgroundColor: colors.surface }]}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>
              Bước 1: Nhập email tài khoản
            </Text>
            <Text style={[styles.cardDesc, { color: colors.textSecondary }]}>
              Hệ thống sẽ gửi mã xác thực gồm 6 chữ số đến địa chỉ email đã đăng ký của bạn.
            </Text>

            <Input
              label="Email đã đăng ký"
              placeholder="vd: trongnghia@gmail.com"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              leftIcon={<Ionicons name="mail-outline" size={20} color={colors.textSecondary} />}
            />

            <Button
              title="Gửi mã xác thực OTP"
              onPress={handleSendEmail}
              loading={loading}
              variant="primary"
              size="lg"
              style={styles.actionBtn}
            />
          </View>
        )}

        {/* STEP 2: Enter OTP */}
        {step === 2 && (
          <View style={[styles.card, { backgroundColor: colors.surface }]}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>
              Bước 2: Nhập mã xác thực OTP
            </Text>
            <Text style={[styles.cardDesc, { color: colors.textSecondary }]}>
              Mã xác thực đã được gửi tới {email}.
            </Text>

            {/* Demo mode OTP notice */}
            <View style={[styles.demoOtpBox, { backgroundColor: colors.accentLight }]}>
              <Ionicons name="information-circle" size={20} color="#15803D" />
              <Text style={styles.demoOtpText}>
                Mã OTP Demo hiển thị: <Text style={{ fontWeight: '900' }}>{demoOtp}</Text>
              </Text>
            </View>

            <Input
              label="Mã OTP 6 số"
              placeholder="123456"
              value={otp}
              onChangeText={setOtp}
              keyboardType="number-pad"
              leftIcon={<Ionicons name="key-outline" size={20} color={colors.textSecondary} />}
            />

            <View style={styles.resendRow}>
              {canResend ? (
                <TouchableOpacity onPress={handleResendOtp}>
                  <Text style={[styles.resendText, { color: colors.primary }]}>
                    Gửi lại mã OTP
                  </Text>
                </TouchableOpacity>
              ) : (
                <Text style={[styles.countdownText, { color: colors.textSecondary }]}>
                  Gửi lại mã sau {countdown}s
                </Text>
              )}
            </View>

            <Button
              title="Xác nhận mã OTP"
              onPress={handleVerifyOtp}
              loading={loading}
              variant="primary"
              size="lg"
              style={styles.actionBtn}
            />
          </View>
        )}

        {/* STEP 3: Set new password */}
        {step === 3 && (
          <View style={[styles.card, { backgroundColor: colors.surface }]}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>
              Bước 3: Đặt lại mật khẩu mới
            </Text>
            <Text style={[styles.cardDesc, { color: colors.textSecondary }]}>
              Vui lòng thiết lập mật khẩu mới có độ dài từ 6 ký tự trở lên.
            </Text>

            <Input
              label="Mật khẩu mới"
              placeholder="Nhập ít nhất 6 ký tự"
              value={newPassword}
              onChangeText={setNewPassword}
              secureTextEntry
              leftIcon={<Ionicons name="lock-closed-outline" size={20} color={colors.textSecondary} />}
            />

            <Input
              label="Xác nhận mật khẩu mới"
              placeholder="Nhập lại mật khẩu mới"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
              leftIcon={<Ionicons name="shield-checkmark-outline" size={20} color={colors.textSecondary} />}
            />

            <Button
              title="Lưu mật khẩu mới"
              onPress={handleResetPassword}
              loading={loading}
              variant="primary"
              size="lg"
              style={styles.actionBtn}
            />
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    padding: SPACING.lg,
  },
  stepIndicatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: SPACING.lg,
  },
  stepBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepBadgeText: {
    fontSize: 14,
    fontWeight: '800',
  },
  stepLine: {
    width: 40,
    height: 3,
    marginHorizontal: 8,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    padding: 10,
    borderRadius: RADIUS.sm,
    marginBottom: SPACING.md,
  },
  errorText: {
    color: '#EF4444',
    fontSize: 13,
    marginLeft: 8,
    flex: 1,
    fontWeight: '600',
  },
  card: {
    padding: SPACING.lg,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 6,
  },
  cardDesc: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: SPACING.lg,
  },
  demoOtpBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: RADIUS.md,
    marginBottom: SPACING.md,
  },
  demoOtpText: {
    color: '#15803D',
    fontSize: 13,
    marginLeft: 8,
  },
  resendRow: {
    alignItems: 'flex-end',
    marginBottom: SPACING.lg,
  },
  resendText: {
    fontSize: 13,
    fontWeight: '700',
  },
  countdownText: {
    fontSize: 13,
  },
  actionBtn: {
    marginTop: SPACING.xs,
  },
});
