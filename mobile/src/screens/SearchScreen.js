import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { POPULAR_AIRPORTS } from '../data/mockData';

export default function SearchScreen({ navigation }) {
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [date, setDate] = useState('');
  const [showOriginPicker, setShowOriginPicker] = useState(false);
  const [showDestPicker, setShowDestPicker] = useState(false);
  const [errors, setErrors] = useState({});

  const handleSearch = useCallback(() => {
    const errs = {};
    if (!origin.trim()) errs.origin = 'Selecione a origem';
    if (!destination.trim()) errs.destination = 'Selecione o destino';
    if (!date.trim()) errs.date = 'Informe a data';

    if (origin.trim() && destination.trim() && origin === destination) {
      errs.destination = 'Origem e destino devem ser diferentes';
    }

    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    navigation.navigate('Results', {
      origin: origin.trim().toUpperCase(),
      destination: destination.trim().toUpperCase(),
      date: date.trim(),
    });
  }, [origin, destination, date, navigation]);

  const selectAirport = (airport, type) => {
    if (type === 'origin') {
      setOrigin(airport.code);
      setShowOriginPicker(false);
      setErrors((prev) => ({ ...prev, origin: undefined }));
    } else {
      setDestination(airport.code);
      setShowDestPicker(false);
      setErrors((prev) => ({ ...prev, destination: undefined }));
    }
  };

  const swapCities = () => {
    const temp = origin;
    setOrigin(destination);
    setDestination(temp);
  };

  const handleDateChange = (text) => {
    // Formatação simples: YYYY-MM-DD
    const cleaned = text.replace(/[^0-9-]/g, '');
    setDate(cleaned);
    if (cleaned.trim()) {
      setErrors((prev) => ({ ...prev, date: undefined }));
    }
  };

  const renderAirportPicker = (type) => {
    const visible = type === 'origin' ? showOriginPicker : showDestPicker;
    if (!visible) return null;

    return (
      <View className="absolute top-0 left-0 right-0 bottom-0 z-50">
        <TouchableOpacity
          className="absolute inset-0 bg-black/60"
          onPress={() => {
            if (type === 'origin') setShowOriginPicker(false);
            else setShowDestPicker(false);
          }}
        />
        <View className="absolute bottom-0 left-0 right-0 bg-surface rounded-t-3xl max-h-96 pb-8">
          <View className="items-center pt-3 pb-2">
            <View className="w-10 h-1 bg-muted rounded-full" />
          </View>
          <Text className="text-white text-lg font-bold px-6 pb-2">
            {type === 'origin' ? 'Origem' : 'Destino'}
          </Text>
          <ScrollView className="px-4">
            {POPULAR_AIRPORTS.map((airport) => (
              <TouchableOpacity
                key={airport.code}
                className="flex-row items-center py-4 px-2 border-b border-gray-800"
                onPress={() => selectAirport(airport, type)}
              >
                <View className="w-10 h-10 rounded-full bg-primary items-center justify-center mr-4">
                  <Text className="text-white font-bold text-sm">{airport.code}</Text>
                </View>
                <View className="flex-1">
                  <Text className="text-white font-semibold text-base">{airport.code}</Text>
                  <Text className="text-muted text-sm">{airport.city}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-secondary">
      <StatusBar barStyle="light-content" backgroundColor="#0A0E27" />
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          className="flex-1 px-6 pt-8"
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
          <View className="mb-8">
            <Text className="text-accent text-sm font-semibold tracking-widest uppercase">
              FlyTracker
            </Text>
            <Text className="text-white text-3xl font-bold mt-1">
              Para onde hoje?
            </Text>
            <Text className="text-muted text-base mt-2">
              Encontre as melhores ofertas em passagens aéreas
            </Text>
          </View>

          {/* Card de busca */}
          <View className="bg-card rounded-2xl p-5 shadow-lg mb-6">
            <Text className="text-white text-lg font-bold mb-5">
              Buscar voo
            </Text>

            {/* Origem */}
            <View className="mb-4">
              <Text className="text-muted text-sm font-semibold mb-2 uppercase tracking-wider">
                Origem
              </Text>
              <TouchableOpacity
                className={`flex-row items-center bg-surface rounded-xl px-4 h-14 border ${
                  errors.origin ? 'border-error' : 'border-gray-700'
                }`}
                onPress={() => {
                  setShowOriginPicker(true);
                  setShowDestPicker(false);
                }}
              >
                <Text className="text-2xl mr-3">🛫</Text>
                <Text className={`text-base flex-1 ${origin ? 'text-white' : 'text-muted'}`}>
                  {origin || 'Selecione o aeroporto de origem'}
                </Text>
                <Text className="text-muted">▼</Text>
              </TouchableOpacity>
              {errors.origin && (
                <Text className="text-error text-xs mt-1 ml-1">{errors.origin}</Text>
              )}
            </View>

            {/* Botão swap */}
            <View className="items-center -my-2 z-10">
              <TouchableOpacity
                className="w-10 h-10 rounded-full bg-primary items-center justify-center shadow-md"
                onPress={swapCities}
              >
                <Text className="text-white text-lg">⇅</Text>
              </TouchableOpacity>
            </View>

            {/* Destino */}
            <View className="mb-4">
              <Text className="text-muted text-sm font-semibold mb-2 uppercase tracking-wider">
                Destino
              </Text>
              <TouchableOpacity
                className={`flex-row items-center bg-surface rounded-xl px-4 h-14 border ${
                  errors.destination ? 'border-error' : 'border-gray-700'
                }`}
                onPress={() => {
                  setShowDestPicker(true);
                  setShowOriginPicker(false);
                }}
              >
                <Text className="text-2xl mr-3">🛬</Text>
                <Text className={`text-base flex-1 ${destination ? 'text-white' : 'text-muted'}`}>
                  {destination || 'Selecione o aeroporto de destino'}
                </Text>
                <Text className="text-muted">▼</Text>
              </TouchableOpacity>
              {errors.destination && (
                <Text className="text-error text-xs mt-1 ml-1">{errors.destination}</Text>
              )}
            </View>

            {/* Data */}
            <View className="mb-6">
              <Text className="text-muted text-sm font-semibold mb-2 uppercase tracking-wider">
                Data de ida
              </Text>
              <View className={`flex-row items-center bg-surface rounded-xl px-4 h-14 border ${
                errors.date ? 'border-error' : 'border-gray-700'
              }`}>
                <Text className="text-2xl mr-3">📅</Text>
                <TextInput
                  className="text-white text-base flex-1 h-full"
                  placeholder="AAAA-MM-DD"
                  placeholderTextColor="#6B7280"
                  value={date}
                  onChangeText={handleDateChange}
                  keyboardType="numbers-and-punctuation"
                  maxLength={10}
                />
              </View>
              {errors.date && (
                <Text className="text-error text-xs mt-1 ml-1">{errors.date}</Text>
              )}
            </View>

            {/* Botão Buscar */}
            <TouchableOpacity
              className="bg-accent rounded-xl h-14 items-center justify-center shadow-lg shadow-blue-500/30"
              onPress={handleSearch}
              activeOpacity={0.8}
            >
              <Text className="text-white text-lg font-bold">🔍  Buscar voos</Text>
            </TouchableOpacity>
          </View>

          {/* Atalhos rápidos */}
          <View className="mb-8">
            <Text className="text-white text-base font-bold mb-3">Rotas populares</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {[
                { from: 'GRU', to: 'GIG', label: 'SP → RJ', price: 'a partir de R$ 289' },
                { from: 'GRU', to: 'BSB', label: 'SP → BSB', price: 'a partir de R$ 389' },
                { from: 'GIG', to: 'GRU', label: 'RJ → SP', price: 'a partir de R$ 259' },
                { from: 'GRU', to: 'REC', label: 'SP → REC', price: 'a partir de R$ 629' },
              ].map((route, i) => (
                <TouchableOpacity
                  key={i}
                  className="bg-card rounded-2xl p-4 mr-3 min-w-[140px]"
                  onPress={() => {
                    setOrigin(route.from);
                    setDestination(route.to);
                    setErrors({});
                  }}
                >
                  <Text className="text-white font-bold text-base">{route.label}</Text>
                  <Text className="text-muted text-xs mt-1">{route.price}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </ScrollView>

        {/* Airport Pickers - Modal style */}
        {renderAirportPicker('origin')}
        {renderAirportPicker('destination')}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
