import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  SafeAreaView,
  StatusBar,
  Switch,
  Alert,
} from 'react-native';
import {
  MOCK_ALERTS,
  POPULAR_AIRPORTS,
  toggleAlert,
  deleteAlert,
} from '../data/mockData';

export default function AlertsScreen() {
  const [alerts, setAlerts] = useState(MOCK_ALERTS);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    origin: '',
    destination: '',
    maxPrice: '',
    maxMiles: '',
  });
  const [formErrors, setFormErrors] = useState({});
  const [showOriginPicker, setShowOriginPicker] = useState(false);
  const [showDestPicker, setShowDestPicker] = useState(false);

  const handleToggle = useCallback((alertId) => {
    const updated = toggleAlert(alertId);
    if (updated) {
      setAlerts((prev) =>
        prev.map((a) => (a.id === alertId ? { ...a, active: updated.active } : a))
      );
    }
  }, []);

  const handleDelete = useCallback((alertId) => {
    Alert.alert(
      'Excluir alerta',
      'Tem certeza que deseja excluir este alerta?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: () => {
            deleteAlert(alertId);
            setAlerts((prev) => prev.filter((a) => a.id !== alertId));
          },
        },
      ]
    );
  }, []);

  const selectAirport = (airport, type) => {
    if (type === 'origin') {
      setFormData((prev) => ({ ...prev, origin: airport.code }));
      setShowOriginPicker(false);
      setFormErrors((prev) => ({ ...prev, origin: undefined }));
    } else {
      setFormData((prev) => ({ ...prev, destination: airport.code }));
      setShowDestPicker(false);
      setFormErrors((prev) => ({ ...prev, destination: undefined }));
    }
  };

  const handleCreateAlert = useCallback(() => {
    const errs = {};
    if (!formData.origin) errs.origin = 'Selecione a origem';
    if (!formData.destination) errs.destination = 'Selecione o destino';
    if (!formData.maxPrice && !formData.maxMiles) {
      errs.maxPrice = 'Defina o preço máximo ou milhas';
    }
    if (formData.origin && formData.destination && formData.origin === formData.destination) {
      errs.destination = 'Origem e destino devem ser diferentes';
    }

    setFormErrors(errs);
    if (Object.keys(errs).length > 0) return;

    const newAlert = {
      id: `a${Date.now()}`,
      origin: formData.origin.toUpperCase(),
      originCity: POPULAR_AIRPORTS.find((a) => a.code === formData.origin)?.city || formData.origin,
      destination: formData.destination.toUpperCase(),
      destinationCity: POPULAR_AIRPORTS.find((a) => a.code === formData.destination)?.city || formData.destination,
      maxPrice: Number(formData.maxPrice) || 9999,
      maxMiles: Number(formData.maxMiles) || 999999,
      active: true,
      createdAt: new Date().toISOString().split('T')[0],
    };

    setAlerts((prev) => [newAlert, ...prev]);
    setFormData({ origin: '', destination: '', maxPrice: '', maxMiles: '' });
    setShowForm(false);
    Alert.alert('Sucesso', 'Alerta de preço criado com sucesso!');
  }, [formData]);

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

  const formatBRL = (value) => {
    return `R$ ${value.toFixed(2).replace('.', ',')}`;
  };

  const formatMiles = (value) => {
    return value.toLocaleString('pt-BR') + ' milhas';
  };

  return (
    <SafeAreaView className="flex-1 bg-secondary">
      <StatusBar barStyle="light-content" backgroundColor="#0A0E27" />

      {/* Header */}
      <View className="px-6 pt-4 pb-3">
        <Text className="text-accent text-sm font-semibold tracking-widest uppercase">
          FlyTracker
        </Text>
        <View className="flex-row items-center justify-between mt-1">
          <View>
            <Text className="text-white text-2xl font-bold">Alertas</Text>
            <Text className="text-muted text-base mt-1">
              Monitore os melhores preços
            </Text>
          </View>
          <TouchableOpacity
            className="bg-accent rounded-xl px-4 py-3 shadow-lg shadow-blue-500/30"
            onPress={() => setShowForm(!showForm)}
          >
            <Text className="text-white font-bold text-sm">
              {showForm ? '✕ Fechar' : '+ Novo'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* Formulário de novo alerta */}
        {showForm && (
          <View className="mx-6 mb-4 bg-card rounded-2xl p-5 border border-gray-700">
            <Text className="text-white text-base font-bold mb-4">Criar alerta de preço</Text>

            {/* Origem */}
            <View className="mb-3">
              <Text className="text-muted text-xs mb-1 uppercase tracking-wider">Origem</Text>
              <TouchableOpacity
                className={`flex-row items-center bg-surface rounded-xl px-4 h-12 border ${
                  formErrors.origin ? 'border-error' : 'border-gray-700'
                }`}
                onPress={() => { setShowOriginPicker(true); setShowDestPicker(false); }}
              >
                <Text className={`flex-1 ${formData.origin ? 'text-white' : 'text-muted'}`}>
                  {formData.origin || 'Selecione...'}
                </Text>
                <Text className="text-muted">▼</Text>
              </TouchableOpacity>
              {formErrors.origin && <Text className="text-error text-xs mt-1">{formErrors.origin}</Text>}
            </View>

            {/* Destino */}
            <View className="mb-3">
              <Text className="text-muted text-xs mb-1 uppercase tracking-wider">Destino</Text>
              <TouchableOpacity
                className={`flex-row items-center bg-surface rounded-xl px-4 h-12 border ${
                  formErrors.destination ? 'border-error' : 'border-gray-700'
                }`}
                onPress={() => { setShowDestPicker(true); setShowOriginPicker(false); }}
              >
                <Text className={`flex-1 ${formData.destination ? 'text-white' : 'text-muted'}`}>
                  {formData.destination || 'Selecione...'}
                </Text>
                <Text className="text-muted">▼</Text>
              </TouchableOpacity>
              {formErrors.destination && <Text className="text-error text-xs mt-1">{formErrors.destination}</Text>}
            </View>

            {/* Preço máximo */}
            <View className="mb-3">
              <Text className="text-muted text-xs mb-1 uppercase tracking-wider">Preço máximo (R$)</Text>
              <TextInput
                className="bg-surface border border-gray-700 rounded-xl px-4 h-12 text-white"
                placeholder="Ex: 500"
                placeholderTextColor="#6B7280"
                keyboardType="numeric"
                value={formData.maxPrice}
                onChangeText={(text) => {
                  setFormData((prev) => ({ ...prev, maxPrice: text.replace(/[^0-9]/g, '') }));
                  setFormErrors((prev) => ({ ...prev, maxPrice: undefined }));
                }}
              />
              {formErrors.maxPrice && (
                <Text className="text-error text-xs mt-1">{formErrors.maxPrice}</Text>
              )}
            </View>

            {/* Milhas máximas */}
            <View className="mb-4">
              <Text className="text-muted text-xs mb-1 uppercase tracking-wider">Milhas máximas</Text>
              <TextInput
                className="bg-surface border border-gray-700 rounded-xl px-4 h-12 text-white"
                placeholder="Ex: 15000"
                placeholderTextColor="#6B7280"
                keyboardType="numeric"
                value={formData.maxMiles}
                onChangeText={(text) => {
                  setFormData((prev) => ({ ...prev, maxMiles: text.replace(/[^0-9]/g, '') }));
                }}
              />
            </View>

            <TouchableOpacity
              className="bg-accent rounded-xl h-12 items-center justify-center"
              onPress={handleCreateAlert}
              activeOpacity={0.8}
            >
              <Text className="text-white font-bold">✓ Criar alerta</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Lista de alertas */}
        <View className="px-6">
          {alerts.length === 0 ? (
            <View className="items-center justify-center py-16">
              <Text className="text-6xl mb-4">🔔</Text>
              <Text className="text-white text-xl font-bold text-center mb-2">
                Nenhum alerta ativo
              </Text>
              <Text className="text-muted text-base text-center px-8">
                Crie alertas para ser notificado quando os preços das passagens baixarem.
              </Text>
            </View>
          ) : (
            alerts.map((alert) => (
              <View
                key={alert.id}
                className={`bg-card rounded-2xl p-5 mb-4 border ${
                  alert.active ? 'border-accent/30' : 'border-gray-800'
                }`}
              >
                {/* Cabeçalho do alerta */}
                <View className="flex-row items-center justify-between mb-3">
                  <View className="flex-row items-center">
                    <View className={`w-3 h-3 rounded-full mr-2 ${
                      alert.active ? 'bg-success' : 'bg-gray-500'
                    }`} />
                    <Text className={`font-bold text-base ${
                      alert.active ? 'text-white' : 'text-muted'
                    }`}>
                      {alert.origin} → {alert.destination}
                    </Text>
                  </View>
                  <TouchableOpacity
                    className="w-8 h-8 rounded-full bg-surface items-center justify-center"
                    onPress={() => handleDelete(alert.id)}
                  >
                    <Text className="text-error">✕</Text>
                  </TouchableOpacity>
                </View>

                {/* Destinos completos */}
                <Text className="text-muted text-xs mb-3">
                  {alert.originCity} → {alert.destinationCity}
                </Text>

                {/* Limites */}
                <View className="flex-row mb-4">
                  <View className="flex-1 bg-surface rounded-xl p-3 mr-2">
                    <Text className="text-muted text-xs mb-1">Preço máx.</Text>
                    <Text className={`text-base font-bold ${
                      alert.active ? 'text-white' : 'text-muted'
                    }`}>
                      {formatBRL(alert.maxPrice)}
                    </Text>
                  </View>
                  <View className="flex-1 bg-surface rounded-xl p-3 ml-2">
                    <Text className="text-muted text-xs mb-1">Milhas máx.</Text>
                    <Text className={`text-base font-bold ${
                      alert.active ? 'text-warning' : 'text-muted'
                    }`}>
                      {formatMiles(alert.maxMiles)}
                    </Text>
                  </View>
                </View>

                {/* Status e toggle */}
                <View className="flex-row items-center justify-between pt-3 border-t border-gray-800">
                  <Text className="text-muted text-xs">
                    Criado em {alert.createdAt}
                  </Text>
                  <View className="flex-row items-center">
                    <Text className="text-muted text-xs mr-2">
                      {alert.active ? 'Ativo' : 'Inativo'}
                    </Text>
                    <Switch
                      value={alert.active}
                      onValueChange={() => handleToggle(alert.id)}
                      trackColor={{ false: '#374151', true: '#1A56DB' }}
                      thumbColor={alert.active ? '#3B82F6' : '#9CA3AF'}
                    />
                  </View>
                </View>
              </View>
            ))
          )}

          {/* Espaço inferior */}
          <View className="h-8" />
        </View>
      </ScrollView>

      {/* Airport Pickers */}
      {renderAirportPicker('origin')}
      {renderAirportPicker('destination')}
    </SafeAreaView>
  );
}
