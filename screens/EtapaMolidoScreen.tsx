import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, StatusBar, ActivityIndicator, Image as RNImage, BackHandler, Modal, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import * as DocumentPicker from 'expo-document-picker';
import { ArrowLeft, CheckCircle2, Camera, Edit2, Lock, Thermometer, Layers } from 'lucide-react-native';

import { Theme } from '../theme';
import { useAuthStore } from '../store/authStore';
import { lotesService } from '../services/lotes.service';
import { molidoService } from '../services/molido.service';
import { CustomAlert } from '../components/GlobalAlert';

const GRANULOMETRIA_TYPES = [
    { label: 'Fina', value: 'fina' as const },
    { label: 'Media', value: 'media' as const },
    { label: 'Gruesa', value: 'gruesa' as const }
];

const ROL_TECNICO = 'TECNICO_MOLIENDA';
const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;

const EtapaMolidoScreen = ({ navigation, route }: any) => {
    const lote = route.params?.lote;
    const readOnlyParam = route.params?.readOnly;
    const { role, userId } = useAuthStore();

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [previewVisible, setPreviewVisible] = useState(false);

    const [modo, setModo] = useState<'loading' | 'form' | 'readonly' | 'nopermiso'>('loading');
    const [registroExistente, setRegistroExistente] = useState<any>(null);
    const [editMode, setEditMode] = useState(false);

    const [granulometria, setGranulometria] = useState<'fina' | 'media' | 'gruesa' | null>(null);
    const [temperatura, setTemperatura] = useState('');
    const [evidenceUri, setEvidenceUri] = useState('');
    const [fechaInicio, setFechaInicio] = useState<string | null>(null);

    useFocusEffect(
        useCallback(() => {
            const onBackPress = () => { navigation.navigate('ViewLote', { lote }); return true; };
            const backHandler = BackHandler.addEventListener('hardwareBackPress', onBackPress);
            return () => backHandler.remove();
        }, [navigation, lote])
    );

    const fetchData = useCallback(async () => {
        if (!lote?.id) return;
        try {
            setLoading(true);
            const [registro, stagesData] = await Promise.all([
                molidoService.getByLoteId(lote.id).catch(() => null),
                lotesService.getStages(lote.id).catch(() => [])
            ]);

            const stage = stagesData.find((s: any) => s.etapa === 'Molido');
            const stageFechaInicio = stage?.fecha_inicio || new Date().toISOString();

            if (registro) {
                setRegistroExistente(registro);
                setModo('readonly');
                setFechaInicio(registro.fecha_inicio || stageFechaInicio);
                return;
            }

            setFechaInicio(stageFechaInicio);

            const cleanRole = (typeof role === 'string' ? role : (role as any)?.name || '').toUpperCase();
            const esTecnico = cleanRole.includes(ROL_TECNICO) || cleanRole === 'ADMIN' || cleanRole === 'GERENTE GENERAL';

            if (!esTecnico || readOnlyParam) {
                setModo('nopermiso');
                return;
            }
            setModo('form');
        } catch (error) {
            setModo('nopermiso');
        } finally {
            setLoading(false);
        }
    }, [lote?.id, role, readOnlyParam]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const handlePickEvidence = async () => {
        try {
            const result = await DocumentPicker.getDocumentAsync({ type: 'image/*', copyToCacheDirectory: true });
            if (!result.canceled && result.assets?.[0]) {
                if (result.assets[0].size! > MAX_IMAGE_SIZE_BYTES) {
                    CustomAlert.show('ALERTA', 'Imagen pesada', 'Máximo 5MB'); return;
                }
                setEvidenceUri(result.assets[0].uri);
            }
        } catch { CustomAlert.show('ERROR', 'Error', 'No se pudo seleccionar la imagen.'); }
    };

    const handleFinalizar = () => {
        if (!granulometria) return CustomAlert.show('ALERTA', 'Incompleto', 'Selecciona la granulometría.');
        if (!temperatura) return CustomAlert.show('ALERTA', 'Incompleto', 'Ingresa la temperatura.');
        // Validación de rango para temperatura de molido (10.0 a 60.0)
        const temperaturaNum = parseFloat(temperatura);
        if (isNaN(temperaturaNum) || temperaturaNum < 10.0 || temperaturaNum > 60.0) {
            return CustomAlert.show('ALERTA', 'Rango inválido', 'La temperatura debe estar entre 10.0 y 60.0 °C.');
        }
        if (!evidenceUri && !registroExistente?.imagen_evidencia_uri) return CustomAlert.show('ALERTA', 'Incompleto', 'Adjunta evidencia.');

        CustomAlert.show('ALERTA', 'Cerrar Fase', '¿Registrar molienda?', async () => { await handleConfirm(temperaturaNum); }, 'ACEPTAR', () => { }, 'CANCELAR');
    };

    const handleConfirm = async (temperaturaNum: number) => {
        const esEdicion = !!registroExistente?.id;
        const now = new Date().toISOString();

        const dataObj = {
            id: esEdicion ? registroExistente.id : `molido_${Date.now()}`,
            lote_id: lote.id,
            responsable_id: userId ?? '',
            granulometria,
            temperatura: temperaturaNum,
            imagen_evidencia_uri: evidenceUri || registroExistente?.imagen_evidencia_uri,
            fecha_inicio: fechaInicio || now,
            fecha_final: now,
        };

        try {
            setSaving(true);
            if (esEdicion) {
                const { id, ...updateData } = dataObj;
                await molidoService.update(registroExistente.id, updateData);
            } else {
                await molidoService.create(dataObj);
            }
            await lotesService.updateStageStatus(lote.id, 'Molido', 'Completada');
            CustomAlert.show('SUCCESS', 'Éxito', 'Molido registrado correctamente.', () => navigation.navigate('ViewLote', { lote }));
            await fetchData();
            setEditMode(false);
        } catch {
            CustomAlert.show('ERROR', 'Error', 'Fallo al guardar.');
        } finally { setSaving(false); }
    };

    const handleEditar = () => {
        setGranulometria(registroExistente?.granulometria);
        setTemperatura(registroExistente?.temperatura?.toString() || '');
        setEvidenceUri(registroExistente?.imagen_evidencia_uri ?? '');
        setEditMode(true);
    };

    if (loading) return <View style={styles.loadingContainer}><ActivityIndicator size="large" color={Theme.colors.terroirBrown} /></View>;

    const hayDatos = modo === 'readonly';
    const sinPermiso = modo === 'nopermiso';

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor={Theme.colors.terroirBeige} />
            <View style={styles.navBar}>
                <TouchableOpacity onPress={() => navigation.navigate('ViewLote', { lote })} style={styles.backButton}><ArrowLeft size={24} color={Theme.colors.terroirBrown} /></TouchableOpacity>
                <CheckCircle2 size={24} color={Theme.colors.terroirBrown} />
            </View>
            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                <View style={styles.header}>
                    <View style={styles.headerMeta}>
                        <Text style={styles.labelCaps}>LOTE ID: {lote?.codigo || '—'}</Text>
                        <Text style={styles.dot}>•</Text>
                        <Text style={styles.labelCaps}>VARIEDAD: {lote?.variedadCafe || '—'}</Text>
                    </View>
                    <Text style={styles.displayTitle}>Molido</Text>
                    <Text style={styles.subtitle}>Registre la granulometría de la molienda y la temperatura del grano al finalizar el proceso.</Text>
                </View>

                <View style={styles.timelineCard}>
                    <View style={styles.phaseHeaderRow}>
                        <View>
                            <Text style={[styles.phaseTitle, hayDatos ? { color: Theme.colors.terroirGreen } : { color: Theme.colors.terroirBrown }]}>Molido</Text>
                            {hayDatos ? <Text style={styles.activeTag}>FASE CERRADA</Text> : (!sinPermiso && <Text style={styles.activeTag}>EN PROCESO</Text>)}
                        </View>
                        {hayDatos && !readOnlyParam && !editMode && (
                            <TouchableOpacity style={styles.editPhaseBtn} onPress={handleEditar}><Edit2 size={14} color={Theme.colors.terroirBrown} /><Text style={styles.editPhaseText}>EDITAR</Text></TouchableOpacity>
                        )}
                    </View>

                    {sinPermiso && !hayDatos && (
                        <View style={[styles.metricsCard, styles.cardWhiteDashed]}>
                            <View style={styles.lockedBanner}><Lock size={15} color="#E6A817" /><Text style={styles.lockedBannerTitle}>Restringido</Text></View>
                        </View>
                    )}

                    {(hayDatos || modo === 'form') && (
                        <View style={[styles.metricsCard, hayDatos ? styles.cardBeige : styles.cardGreenLight]}>

                            <View style={styles.metricInputGroup}>
                                <View style={styles.sectionInlineHeader}><Layers size={14} color={Theme.colors.terroirBrown} /><Text style={styles.standardLabel}>GRANULOMETRÍA*</Text></View>
                                <View style={styles.optionsGrid}>
                                    {GRANULOMETRIA_TYPES.map(type => {
                                        const selected = (hayDatos && !editMode ? registroExistente?.granulometria : granulometria) === type.value;
                                        return (
                                            <TouchableOpacity key={type.value} disabled={hayDatos && !editMode} style={[styles.optionButton, selected && styles.optionButtonActive, (hayDatos && !editMode) && !selected && { opacity: 0.5 }]} onPress={() => setGranulometria(type.value)}>
                                                <Text style={[styles.optionButtonText, selected && styles.optionButtonTextActive]}>{type.label}</Text>
                                            </TouchableOpacity>
                                        );
                                    })}
                                </View>
                            </View>

                            <View style={styles.metricInputGroup}>
                                <View style={styles.sectionInlineHeader}><Thermometer size={14} color={Theme.colors.terroirBrown} /><Text style={styles.standardLabel}>TEMPERATURA (°C)*</Text></View>
                                <TextInput
                                    style={[styles.textInput, hayDatos && !editMode && styles.inputDisabled]}
                                    placeholder="Ej. 40.5"
                                    keyboardType="numeric"
                                    value={hayDatos && !editMode ? registroExistente?.temperatura?.toString() : temperatura}
                                    onChangeText={(text) => {
                                        // Igual que en tostado, pero restringimos a 2 dígitos enteros
                                        const cleaned = text.replace(/[^0-9.]/g, '')
                                            .replace(/(\..*?)\..*/g, '$1');

                                        const parts = cleaned.split('.');
                                        if (parts[0].length > 2) parts[0] = parts[0].slice(0, 2); // Trunca a 2 dígitos

                                        setTemperatura(parts.join('.'));
                                    }}
                                    editable={!hayDatos || editMode}
                                />
                            </View>

                            <View style={styles.metricInputGroup}>
                                <View style={styles.sectionInlineHeader}><Camera size={14} color={Theme.colors.terroirBrown} /><Text style={styles.standardLabel}>EVIDENCIA VISUAL*</Text></View>
                                {hayDatos && !editMode ? (
                                    registroExistente?.imagen_evidencia_uri ? (
                                        <TouchableOpacity onPress={() => setPreviewVisible(true)}><RNImage source={{ uri: registroExistente.imagen_evidencia_uri }} style={styles.evidenceImage} resizeMode="contain" /></TouchableOpacity>
                                    ) : <View style={styles.inputDisabled}><Text style={styles.evidenceReadonlyText}>Sin imagen</Text></View>
                                ) : (
                                    <View>
                                        {evidenceUri ? <TouchableOpacity onPress={() => setPreviewVisible(true)}><RNImage source={{ uri: evidenceUri }} style={styles.evidenceImage} resizeMode="contain" /></TouchableOpacity> : null}
                                        <TouchableOpacity style={styles.evidencePickerButton} onPress={handlePickEvidence}><Camera size={15} color="white" /><Text style={styles.evidencePickerText}>{evidenceUri ? 'Cambiar imagen' : 'Seleccionar fotografía'}</Text></TouchableOpacity>
                                    </View>
                                )}
                            </View>

                            <Modal visible={previewVisible} transparent animationType="fade" onRequestClose={() => setPreviewVisible(false)}>
                                <TouchableOpacity style={styles.previewOverlay} activeOpacity={1} onPress={() => setPreviewVisible(false)}>
                                    <RNImage source={{ uri: hayDatos && !editMode ? registroExistente?.imagen_evidencia_uri : evidenceUri }} style={styles.previewImage} resizeMode="contain" />
                                </TouchableOpacity>
                            </Modal>

                            {(modo === 'form' || editMode) && (
                                <TouchableOpacity style={styles.actionButton} onPress={handleFinalizar} disabled={saving}>
                                    {saving ? <ActivityIndicator size="small" color="white" /> : <Text style={styles.actionButtonText}>{hayDatos ? 'GUARDAR ACTUALIZACIÓN' : 'REGISTRAR CIERRE'}</Text>}
                                </TouchableOpacity>
                            )}
                        </View>
                    )}
                </View>
            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Theme.colors.terroirBeige },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    navBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 12 },
    backButton: { padding: 4 },
    scrollContent: { paddingHorizontal: 20, paddingBottom: 40 },
    header: { paddingTop: 16, paddingBottom: 24 },
    displayTitle: { fontFamily: 'Manrope', fontSize: 30, fontWeight: '800', color: Theme.colors.terroirBrown, marginBottom: 12 },
    subtitle: { fontFamily: 'Manrope', fontSize: 14, color: Theme.colors.terroirGray, lineHeight: 22 },
    timelineCard: { backgroundColor: 'white', borderRadius: 24, padding: 24, elevation: 2 },
    phaseHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
    phaseTitle: { fontFamily: 'Manrope', fontSize: 18, fontWeight: '800' },
    activeTag: { fontFamily: 'Manrope', fontSize: 10, fontWeight: '800', color: Theme.colors.terroirGreen, marginTop: 4 },
    editPhaseBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(93, 58, 44, 0.05)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
    editPhaseText: { fontFamily: 'Manrope', fontSize: 9, fontWeight: '800', color: Theme.colors.terroirBrown },
    metricsCard: { marginTop: 12, borderRadius: 16, padding: 16, gap: 20 },
    cardBeige: { backgroundColor: Theme.colors.terroirBeige },
    cardGreenLight: { backgroundColor: Theme.colors.terroirGreenLight, borderWidth: 1, borderColor: 'rgba(62, 102, 65, 0.1)' },
    cardWhiteDashed: { backgroundColor: 'white', borderWidth: 1, borderColor: '#E5E7EB', borderStyle: 'dashed' },
    textInput: { backgroundColor: 'white', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 10, height: 44, paddingHorizontal: 12, fontFamily: 'Manrope', fontSize: 13, color: Theme.colors.terroirText },
    metricInputGroup: { gap: 8 },
    standardLabel: { fontFamily: 'Manrope', fontSize: 10, fontWeight: '800', color: Theme.colors.terroirBrown, marginLeft: 2 },
    sectionInlineHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
    optionsGrid: { flexDirection: 'row', gap: 8 },
    optionButton: { flex: 1, alignItems: 'center', paddingVertical: 12, borderRadius: 10, backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#E5E7EB' },
    optionButtonActive: { backgroundColor: 'rgba(62, 102, 65, 0.1)', borderColor: Theme.colors.terroirGreen },
    optionButtonText: { fontSize: 11, fontWeight: '800', color: Theme.colors.terroirGray },
    optionButtonTextActive: { color: Theme.colors.terroirGreen },
    evidencePickerText: { fontFamily: 'Manrope', fontSize: 12, fontWeight: '800', color: 'white' },
    lockedBanner: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, backgroundColor: '#FFF8E1', borderRadius: 12, padding: 12 },
    lockedBannerTitle: { fontFamily: 'Manrope', fontSize: 13, fontWeight: '900', color: '#E65100' },
    actionButton: { width: '100%', height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: Theme.colors.terroirGreen },
    actionButtonText: { fontFamily: 'Manrope', fontSize: 10, fontWeight: '800', color: 'white' },
    evidenceReadonlyText: { fontFamily: 'Manrope', fontSize: 12, color: Theme.colors.terroirGray },
    evidencePickerButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: Theme.colors.terroirBrown, height: 48, borderRadius: 12, gap: 8 },
    evidenceImage: { width: '100%', height: 180, borderRadius: 12, backgroundColor: '#F3F4F6' },
    previewOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'center', alignItems: 'center' },
    previewImage: { width: '100%', height: '100%' },
    inputDisabled: { backgroundColor: '#F9FAFB', color: Theme.colors.terroirGray, opacity: 0.8 },
    headerMeta: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
    labelCaps: { fontFamily: 'Manrope', fontSize: 10, fontWeight: '800', color: Theme.colors.terroirBrown, textTransform: 'uppercase', letterSpacing: 2 },
    dot: { color: '#D1D5DB' },
});

export default EtapaMolidoScreen;