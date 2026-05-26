import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDispatch, useSelector } from 'react-redux';
import { setActiveStoreAction } from '../SelectTakeawayModule/Redux/SelectTakeawayActions';

export default function SelectTakeawayScreen() {
  const dispatch = useDispatch();
  const takeawayList = useSelector(s => s.authState.takeawayListResponse ?? []);
  const [search, setSearch] = useState('');

  const filtered = search.trim()
    ? takeawayList.filter(
        s =>
          s.name?.toLowerCase().includes(search.toLowerCase()) ||
          s.postcode?.toLowerCase().includes(search.toLowerCase()),
      )
    : takeawayList;

  const handleSelect = useCallback(store => {
    dispatch(setActiveStoreAction(store));
  }, [dispatch]);

  const renderItem = ({ item }) => (
    <TouchableOpacity
      style={styles.storeCard}
      onPress={() => handleSelect(item)}
    >
      <View style={styles.storeInfo}>
        <Text style={styles.storeName}>{item.name}</Text>
        <Text style={styles.storeAddress}>
          {[item.street, item.town, item.postcode].filter(Boolean).join(', ')}
        </Text>
        {item.host ? <Text style={styles.storePhone}>{item.host}</Text> : null}
      </View>
      <Text style={styles.arrow}>›</Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Select Takeaway</Text>
        <Text style={styles.subtitle}>
          Choose the store to monitor for incoming calls
        </Text>
      </View>

      {/* Search bar — matches SelectTakeawayModal.handleSearch */}
      {takeawayList.length > 5 && (
        <View style={styles.searchContainer}>
          <TextInput
            style={styles.searchInput}
            value={search}
            onChangeText={setSearch}
            placeholder="Search by name or postcode..."
            placeholderTextColor="#999"
            clearButtonMode="while-editing"
          />
        </View>
      )}

      <FlatList
        data={filtered}
        keyExtractor={item => String(item.store_id)}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <Text style={styles.empty}>No takeaways match your search.</Text>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f4f8' },
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 12,
    backgroundColor: '#fff',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e0e0e0',
  },
  title: { fontSize: 24, fontWeight: '700', color: '#1a1a1a' },
  subtitle: { fontSize: 13, color: '#666', marginTop: 4 },
  searchContainer: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e0e0e0',
  },
  searchInput: {
    backgroundColor: '#f0f4f8',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: '#1a1a1a',
  },
  list: { padding: 16, gap: 10 },
  storeCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
    marginBottom: 10,
  },
  storeInfo: { flex: 1 },
  storeName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  storeAddress: { fontSize: 13, color: '#666', lineHeight: 18 },
  storePhone: { fontSize: 13, color: '#2d6a4f', marginTop: 3 },
  arrow: { fontSize: 22, color: '#ccc', marginLeft: 8 },
  empty: { textAlign: 'center', color: '#999', marginTop: 40, fontSize: 14 },
});
