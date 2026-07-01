import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import { searchFlights } from '../data/mockData';

export default function ResultsScreen({ route, navigation }) {
  const { origin, destination, date } = route.params;
  const [sortBy, setSortBy] = useState('price'); // 'price' | 'miles' | 'duration'
  const [loading, setLoading] = useState(false);

  const flights = useMemo(() => {
    setLoading(true);
    // Simula carregamento
    const results = searchFlights({ origin, destination, date });
    setTimeout(() => setLoading(false), 300);
    return results;
  }, [origin, destination, date]);

  const sortedFlights = useMemo(() => {
    const list = [...flights];
    switch (sortBy) {
      case 'price':
        return list.sort((a, b) => a.priceBRL - b.priceBRL);
      case 'miles':
        return list.sort((a, b) => a.miles - b.miles);
      case 'duration':
        return list.sort((a, b) => {
          const [ah, am] = a.duration.replace('h', ':').replace('m', '').split(':');
          const [bh, bm] = b.duration.replace('h', ':').replace('m', '').split(':');
          return parseInt(ah) * 60 + parseInt(am) - (parseInt(bh) * 60 + parseInt(bm));
        });
      default:
        return list;
    }
  }, [flights, sortBy]);

  const formatBRL = (value) => {
    return `R$ ${value.toFixed(2).replace('.', ',')}`;
  };

  const formatMiles = (value) => {
    return value.toLocaleString('pt-BR') + ' milhas';
  };

  const renderSortButton = (label, key) => (
    <TouchableOpacity
      className={`px-4 py-2 rounded-full mr-2 ${
        sortBy === key ? 'bg-accent' : 'bg-card'
      }`}
      onPress={() => setSortBy(key)}
    >
      <Text className={`text-sm font-semibold ${
        sortBy === key ? 'text-white' : 'text-muted'
      }`}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  const getStopsLabel = (flight) => {
    if (flight.stops === 0) return 'Direto';
    return `${flight.stops} parada(s)`;
  };

  const getMigrationScore = (flight) => {
    // Score de 0 a 100: milhas mais baratas (menor milha = melhor score)
    const maxMiles = Math.max(...flights.map((f) => f.miles));
    const score = maxMiles > 0 ? (1 - flight.miles / maxMiles) * 100 : 0;
    return score;
  };

  return (
    <SafeAreaView className="flex-1 bg-secondary">
      <StatusBar barStyle="light-content" backgroundColor="#0A0E27" />

      {/* Header */}
      <View className="px-6 pt-4 pb-3">
        <TouchableOpacity
          className="flex-row items-center mb-3"
          onPress={() => navigation.goBack()}
        >
          <Text className="text-accent text-lg mr-2">←</Text>
          <Text className="text-accent text-base font-semibold">Nova busca</Text>
        </TouchableOpacity>

        <Text className="text-white text-2xl font-bold">
          {origin} → {destination}
        </Text>
        <Text className="text-muted text-base mt-1">
          {date} • {flights.length} voo{flights.length !== 1 ? 's' : ''} encontrado{flights.length !== 1 ? 's' : ''}
        </Text>
      </View>

      {/* Sort options */}
      <View className="px-6 pb-3">
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {renderSortButton('💰 Menor preço', 'price')}
          {renderSortButton('🏆 Menos milhas', 'miles')}
          {renderSortButton('⏱ Mais rápido', 'duration')}
        </ScrollView>
      </View>

      {/* Content */}
      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#3B82F6" />
          <Text className="text-muted text-base mt-3">Buscando voos...</Text>
        </View>
      ) : sortedFlights.length === 0 ? (
        <View className="flex-1 items-center justify-center px-8">
          <Text className="text-6xl mb-4">😕</Text>
          <Text className="text-white text-xl font-bold text-center mb-2">
            Nenhum voo encontrado
          </Text>
          <Text className="text-muted text-base text-center">
            Tente alterar a origem, destino ou data da viagem.
          </Text>
          <TouchableOpacity
            className="mt-6 bg-accent px-8 py-3 rounded-xl"
            onPress={() => navigation.goBack()}
          >
            <Text className="text-white font-bold">Voltar</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView className="flex-1 px-6" showsVerticalScrollIndicator={false}>
          {sortedFlights.map((flight, index) => {
            const score = getMigrationScore(flight);
            return (
              <TouchableOpacity
                key={flight.id}
                className="bg-card rounded-2xl p-5 mb-4 border border-gray-800 active:border-accent"
                activeOpacity={0.7}
              >
                {/* Cabeçalho - Companhia */}
                <View className="flex-row items-center justify-between mb-4">
                  <View className="flex-row items-center">
                    <View className="w-10 h-10 rounded-full bg-surface items-center justify-center mr-3">
                      <Text className="text-white font-bold text-xs">
                        {flight.airline.substring(0, 2)}
                      </Text>
                    </View>
                    <View>
                      <Text className="text-white font-semibold">{flight.airline}</Text>
                      <Text className="text-muted text-xs">{flight.flightNumber}</Text>
                    </View>
                  </View>
                  <View className="bg-surface rounded-full px-3 py-1">
                    <Text className="text-warning text-xs font-semibold">{getStopsLabel(flight)}</Text>
                  </View>
                </View>

                {/* Horários */}
                <View className="flex-row items-center justify-between mb-4">
                  <View className="items-center">
                    <Text className="text-white text-xl font-bold">{flight.departureTime}</Text>
                    <Text className="text-muted text-xs">{flight.origin}</Text>
                  </View>
                  <View className="flex-1 items-center px-4">
                    <View className="flex-row items-center">
                      <View className="h-px bg-gray-600 flex-1" />
                      <Text className="text-muted text-xs mx-2">✈</Text>
                      <View className="h-px bg-gray-600 flex-1" />
                    </View>
                    <Text className="text-muted text-xs mt-1">{flight.duration}</Text>
                  </View>
                  <View className="items-center">
                    <Text className="text-white text-xl font-bold">{flight.arrivalTime}</Text>
                    <Text className="text-muted text-xs">{flight.destination}</Text>
                  </View>
                </View>

                {/* Preços */}
                <View className="flex-row items-center justify-between pt-4 border-t border-gray-800">
                  <View className="flex-1">
                    <Text className="text-muted text-xs mb-1">Preço em dinheiro</Text>
                    <Text className="text-white text-xl font-bold">
                      {formatBRL(flight.priceBRL)}
                    </Text>
                  </View>
                  <View className="flex-1 items-center">
                    <Text className="text-muted text-xs mb-1">Milhas necessárias</Text>
                    <Text className="text-warning text-lg font-bold">
                      {formatMiles(flight.miles)}
                    </Text>
                  </View>
                  <View className="items-end">
                    <Text className="text-muted text-xs mb-1">Score</Text>
                    <View className="flex-row items-center">
                      <View className="w-14 h-2 bg-gray-700 rounded-full overflow-hidden mr-2">
                        <View
                          className="h-full rounded-full"
                          style={{
                            width: `${score}%`,
                            backgroundColor: score > 60 ? '#10B981' : score > 30 ? '#F59E0B' : '#EF4444',
                          }}
                        />
                      </View>
                      <Text className={`text-xs font-bold ${
                        score > 60 ? 'text-success' : score > 30 ? 'text-warning' : 'text-error'
                      }`}>
                        {score.toFixed(0)}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Assentos disponíveis */}
                <View className="flex-row items-center mt-3 pt-2 border-t border-gray-800">
                  <Text className="text-xs text-muted">
                    {flight.seatsAvailable > 0
                      ? `${flight.seatsAvailable} assento${flight.seatsAvailable !== 1 ? 's' : ''} disponíve${flight.seatsAvailable !== 1 ? 'is' : 'l'}`
                      : 'Esgotado'}
                  </Text>
                  {flight.seatsAvailable <= 5 && flight.seatsAvailable > 0 && (
                    <View className="bg-error/20 rounded-full px-2 py-0.5 ml-2">
                      <Text className="text-error text-xs font-semibold">Últimos</Text>
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            );
          })}

          {/* Espaço inferior */}
          <View className="h-8" />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
