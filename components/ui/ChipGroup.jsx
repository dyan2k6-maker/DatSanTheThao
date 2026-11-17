import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { RADIUS, SPACING } from '../../constants/theme';

export const ChipGroup = ({
  label,
  items = [],
  selectedValues = [],
  onToggle = () => {},
  singleSelect = false,
  containerStyle,
}) => {
  const { colors } = useTheme();

  return (
    <View style={[styles.container, containerStyle]}>
      {Boolean(label) && (
        <Text style={[styles.label, { color: colors.text }]}>{label}</Text>
      )}

      <View style={styles.chipsWrap}>
        {items.map((item, idx) => {
          const id = typeof item === 'object' ? item.id : item;
          const name = typeof item === 'object' ? item.name : item;
          const icon = typeof item === 'object' ? item.icon : null;
          const isSelected = selectedValues.includes(id);

          return (
            <TouchableOpacity
              key={id || idx}
              style={[
                styles.chip,
                {
                  backgroundColor: isSelected ? '#DCFCE7' : colors.surface,
                  borderColor: isSelected ? '#16A34A' : colors.border,
                },
              ]}
              activeOpacity={0.7}
              onPress={() => onToggle(id)}
            >
              {icon && (
                <Ionicons
                  name={icon}
                  size={15}
                  color={isSelected ? '#16A34A' : colors.textSecondary}
                  style={{ marginRight: 5 }}
                />
              )}
              <Text
                style={[
                  styles.chipText,
                  {
                    color: isSelected ? '#16A34A' : colors.text,
                    fontWeight: isSelected ? '700' : '500',
                  },
                ]}
              >
                {name}
              </Text>
              {isSelected && (
                <Ionicons
                  name="checkmark"
                  size={14}
                  color="#16A34A"
                  style={{ marginLeft: 4 }}
                />
              )}
            </TouchableOpacity>
          );
        })}
      </View>
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
    marginBottom: 8,
  },
  chipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: RADIUS.full,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 12,
  },
});

export default ChipGroup;
