import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BottomSheet } from './BottomSheet';
import { useTheme } from '../../context/ThemeContext';
import { RADIUS, SPACING } from '../../constants/theme';

export const Select = ({
  label,
  value,
  placeholder = 'Chọn một mục...',
  options = [],
  onSelect = () => {},
  error = '',
  disabled = false,
  containerStyle,
}) => {
  const { colors } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Chuẩn hóa options: hỗ trợ cả string[] và { label, value }[]
  const normalizedOptions = options.map((opt) => {
    if (typeof opt === 'object' && opt !== null) {
      return { label: opt.label ?? String(opt.value), value: opt.value };
    }
    return { label: String(opt), value: opt };
  });

  const selectedItem = normalizedOptions.find((opt) => opt.value === value);
  const displayLabel = selectedItem ? selectedItem.label : value ? String(value) : '';

  const filteredOptions = normalizedOptions.filter((opt) =>
    opt.label.toLowerCase().includes(searchQuery.trim().toLowerCase())
  );

  const handleChoose = (optVal) => {
    onSelect(optVal);
    setIsOpen(false);
    setSearchQuery('');
  };

  return (
    <View style={[styles.container, containerStyle]}>
      {Boolean(label) && (
        <Text style={[styles.label, { color: colors.text }]}>{label}</Text>
      )}

      <TouchableOpacity
        style={[
          styles.triggerBox,
          {
            backgroundColor: colors.surface,
            borderColor: error ? '#EF4444' : colors.border,
          },
          disabled && styles.disabled,
        ]}
        activeOpacity={0.7}
        onPress={() => !disabled && setIsOpen(true)}
      >
        <Text
          style={[
            styles.triggerText,
            { color: displayLabel ? colors.text : colors.textSecondary },
          ]}
          numberOfLines={1}
        >
          {displayLabel || placeholder}
        </Text>
        <Ionicons name="chevron-down" size={18} color={colors.textSecondary} />
      </TouchableOpacity>

      {Boolean(error) && <Text style={styles.errorText}>{error}</Text>}

      {/* BottomSheet Options */}
      <BottomSheet
        visible={isOpen}
        onClose={() => {
          setIsOpen(false);
          setSearchQuery('');
        }}
        title={label || 'Lựa chọn'}
      >
        <View style={styles.sheetInner}>
          {normalizedOptions.length > 8 && (
            <View style={[styles.searchBox, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border }]}>
              <Ionicons name="search" size={16} color={colors.textSecondary} />
              <TextInput
                style={[styles.searchInput, { color: colors.text }]}
                placeholder="Tìm kiếm lựa chọn..."
                placeholderTextColor={colors.textSecondary}
                value={searchQuery}
                onChangeText={setSearchQuery}
                clearButtonMode="while-editing"
              />
            </View>
          )}

          <ScrollView style={styles.optionsList} showsVerticalScrollIndicator={false}>
            {filteredOptions.length === 0 ? (
              <Text style={[styles.noResultText, { color: colors.textSecondary }]}>
                Không tìm thấy kết quả phù hợp
              </Text>
            ) : (
              filteredOptions.map((opt, idx) => {
                const isSelected = opt.value === value;
                return (
                  <TouchableOpacity
                    key={idx}
                    style={[
                      styles.optionItem,
                      { borderBottomColor: colors.border },
                      isSelected && { backgroundColor: '#DCFCE7' },
                    ]}
                    onPress={() => handleChoose(opt.value)}
                  >
                    <Text
                      style={[
                        styles.optionLabel,
                        { color: isSelected ? '#16A34A' : colors.text },
                        isSelected && { fontWeight: '800' },
                      ]}
                    >
                      {opt.label}
                    </Text>
                    {isSelected && (
                      <Ionicons name="checkmark-circle" size={20} color="#16A34A" />
                    )}
                  </TouchableOpacity>
                );
              })
            )}
          </ScrollView>
        </View>
      </BottomSheet>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: SPACING.md,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 6,
  },
  triggerBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 48,
    paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.md,
    borderWidth: 1,
  },
  triggerText: {
    fontSize: 14,
    flex: 1,
  },
  disabled: {
    opacity: 0.5,
  },
  errorText: {
    fontSize: 11,
    color: '#EF4444',
    marginTop: 4,
  },
  sheetInner: {
    paddingHorizontal: SPACING.md,
    gap: SPACING.sm,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 40,
    paddingHorizontal: 10,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    marginBottom: 6,
    gap: 6,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
  },
  optionsList: {
    maxHeight: 320,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 8,
    borderBottomWidth: 0.5,
    borderRadius: RADIUS.sm,
  },
  optionLabel: {
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
  noResultText: {
    fontSize: 13,
    textAlign: 'center',
    paddingVertical: 20,
  },
});

export default Select;
