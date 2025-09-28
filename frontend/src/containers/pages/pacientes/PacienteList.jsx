import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "utils/axiosConfig";
import { toast } from "react-toastify";
import LightboxViewer from "components/LightboxViewer";
import BulkOperations, { useBulkSelection, SelectableItem } from "components/ui/BulkOperations";
import { ImageUploadProgress } from "components/ui/ProgressIndicator";
import { 
  useIsMobile, 
  MobileHeader, 
  MobileSearchBar, 
  MobileList, 
  MobileCard 
} from "components/ui/MobileOptimized";
import {
  MagnifyingGlassIcon,
  UsersIcon,
  FunnelIcon,
  EyeIcon,
  PencilSquareIcon,
  TrashIcon,
  DocumentArrowDownIcon,
  Cog6ToothIcon
} from '@heroicons/react/24/outline';
import BackToHomeButton from 'components/ui/BackToHomeButton';

const PacienteList = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [pacientes, setPacientes] = useState([]);
  const [filteredPacientes, setFilteredPacientes] = useState([]);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [imageSets, setImageSets] = useState([]);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [subImageIndex, setSubImageIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingProgress, setProcessingProgress] = useState(0);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    tipo_diabetes: '',
    estado_dilatacion: '',
    resultado: '',
    fecha_desde: '',
    fecha_hasta: ''
  });

  const navigate = useNavigate();
  const isMobile = useIsMobile();
  
  // Bulk selection hook
  const {
    selectedItems,
    selectItem,
    selectAll,
    deselectAll,
    isSelected,
    hasSelection,
    selectionCount
  } = useBulkSelection(filteredPacientes);

  const buscarPacientes = async (showLoading = true) => {
    try {
      if (showLoading) setIsLoading(true);
      
      const url = searchTerm
        ? `/api/pacientes/buscar/?search=${searchTerm}`
        : `/api/pacientes/`;

      const res = await api.get(url);
      const data = Array.isArray(res.data) ? res.data : res.data.results;
      setPacientes(data);
      applyFilters(data);

      // ✅ Armar sets de imágenes para Lightbox
      const sets = [];
      data.forEach((p) => {
        if (Array.isArray(p.imagenes)) {
          p.imagenes.forEach((img) => {
            sets.push({
              original: img.imagen_procesada || img.imagen || null,
              procesada: img.imagen_procesada || null,
              gradcam: img.gradcam || null,
            });
          });
        }
      });
      setImageSets(sets);
    } catch (error) {
      console.error("Error al buscar pacientes:", error);
      toast.error("Error al cargar la lista de pacientes");
    } finally {
      if (showLoading) setIsLoading(false);
    }
  };

  const applyFilters = (data = pacientes) => {
    let filtered = [...data];

    // Filtro por tipo de diabetes
    if (filters.tipo_diabetes) {
      filtered = filtered.filter(p => p.tipo_diabetes === filters.tipo_diabetes);
    }

    // Filtro por estado de dilatación
    if (filters.estado_dilatacion) {
      filtered = filtered.filter(p => p.estado_dilatacion === filters.estado_dilatacion);
    }

    // Filtro por resultado
    if (filters.resultado) {
      filtered = filtered.filter(p => p.resultado?.toString() === filters.resultado);
    }

    // Filtro por fecha
    if (filters.fecha_desde) {
      filtered = filtered.filter(p => {
        const fechaPaciente = new Date(p.fecha_registro || p.actualizado);
        return fechaPaciente >= new Date(filters.fecha_desde);
      });
    }

    if (filters.fecha_hasta) {
      filtered = filtered.filter(p => {
        const fechaPaciente = new Date(p.fecha_registro || p.actualizado);
        return fechaPaciente <= new Date(filters.fecha_hasta);
      });
    }

    setFilteredPacientes(filtered);
  };

  const handleFilterChange = (filterName, value) => {
    const newFilters = { ...filters, [filterName]: value };
    setFilters(newFilters);
    applyFilters();
  };

  const clearFilters = () => {
    setFilters({
      tipo_diabetes: '',
      estado_dilatacion: '',
      resultado: '',
      fecha_desde: '',
      fecha_hasta: ''
    });
    setFilteredPacientes(pacientes);
  };

  const deletePaciente = async (id) => {
    if (!window.confirm('¿Está seguro de eliminar este paciente?')) return;
    
    try {
      await api.delete(`/api/pacientes/${id}/`);
      toast.success('Paciente eliminado exitosamente');
      buscarPacientes(false);
    } catch (error) {
      toast.error('Error al eliminar paciente');
    }
  };

  // Bulk operations handlers
  const handleBulkDelete = async (selectedIds) => {
    try {
      setIsProcessing(true);
      // Simulate progress
      for (let i = 0; i <= 100; i += 10) {
        setProcessingProgress(i);
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      await Promise.all(
        selectedIds.map(id => api.delete(`/api/pacientes/${id}/`))
      );
      
      deselectAll();
      buscarPacientes(false);
    } catch (error) {
      console.error("Error eliminando pacientes:", error);
    } finally {
      setIsProcessing(false);
      setProcessingProgress(0);
    }
  };

  const handleBulkExport = async (selectedIds) => {
    try {
      setIsProcessing(true);
      const response = await api.post('/api/pacientes/export/', {
        patient_ids: selectedIds
      });
      
      // Download file
      const blob = new Blob([response.data], { type: 'application/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'pacientes_export.csv';
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error exportando pacientes:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleBulkProcess = async (selectedIds) => {
    try {
      setIsProcessing(true);
      await api.post('/api/pacientes/batch-process/', {
        patient_ids: selectedIds
      });
    } catch (error) {
      console.error("Error procesando pacientes:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  useEffect(() => {
    buscarPacientes();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [filters, pacientes]);

  const handleImageClick = (indexSet) => {
    setLightboxIndex(indexSet);
    setSubImageIndex(0);
    setLightboxOpen(true);
  };

  // Mobile patient card component
  const MobilePacienteCard = ({ paciente }) => (
    <MobileCard 
      isSelected={isSelected(paciente.id)}
      showCheckbox={hasSelection}
      onSelect={() => selectItem(paciente.id)}
      onClick={() => !hasSelection && navigate(`/pacientes/editar/${paciente.id}`)}
      className="p-4"
    >
      <div className="flex justify-between items-start mb-3">
        <div className="flex-1">
          <h3 className="font-semibold text-gray-900 text-lg">
            {paciente.nombres} {paciente.apellidos}
          </h3>
          <p className="text-sm text-gray-600">HC: {paciente.historia_clinica}</p>
          <p className="text-sm text-gray-600">CI: {paciente.ci}</p>
        </div>
        {paciente.resultado_texto && (
          <span className={`px-2 py-1 text-xs rounded font-semibold ${
            paciente.resultado === 0
              ? "bg-green-100 text-green-700"
              : "bg-red-100 text-red-700"
          }`}>
            {paciente.resultado_texto}
          </span>
        )}
      </div>

      {/* Image preview for mobile */}
      {Array.isArray(paciente.imagenes) && paciente.imagenes.length > 0 && paciente.imagenes[0].imagen ? (
        <img
          src={paciente.imagenes[0].imagen_procesada || paciente.imagenes[0].imagen}
          alt="Imagen procesada"
          className="w-full h-32 object-cover rounded mb-3"
          onClick={(e) => {
            e.stopPropagation();
            const indexSet = imageSets.findIndex(
              (set) => set.original === paciente.imagenes[0].imagen_procesada || paciente.imagenes[0].imagen
            );
            if (indexSet >= 0) handleImageClick(indexSet);
          }}
        />
      ) : (
        <div className="w-full h-32 flex items-center justify-center bg-gray-100 text-gray-400 rounded mb-3">
          Sin imagen
        </div>
      )}

      <p className="text-xs text-gray-400">
        Última actualización: {paciente.actualizado || "N/D"}
      </p>
    </MobileCard>
  );

  if (isMobile) {
    return (
      <div className="min-h-screen bg-gray-50">
        <MobileHeader 
          title="Gestión de Pacientes"
          actions={[
            {
              icon: FunnelIcon,
              onClick: () => setShowFilters(!showFilters),
              variant: 'secondary',
              title: 'Filtros'
            }
          ]}
        />
        
        {/* Botón dashboard para mobile */}
        <div className="px-4 mb-4">
          <BackToHomeButton variant="secondary" size="sm" className="w-full justify-center" />
        </div>

        <MobileSearchBar
          value={searchTerm}
          onChange={setSearchTerm}
          onSearch={buscarPacientes}
          placeholder="Buscar por DNI, nombre o apellido"
        />

        {/* Filtros móviles */}
        {showFilters && (
          <div className="p-4 bg-white border-b space-y-3">
            <select
              value={filters.tipo_diabetes}
              onChange={(e) => handleFilterChange('tipo_diabetes', e.target.value)}
              className="w-full px-3 py-2 border rounded"
            >
              <option value="">Todos los tipos de diabetes</option>
              <option value="tipo1">Tipo 1</option>
              <option value="tipo2">Tipo 2</option>
              <option value="desconocido">Desconocido</option>
            </select>

            <select
              value={filters.resultado}
              onChange={(e) => handleFilterChange('resultado', e.target.value)}
              className="w-full px-3 py-2 border rounded"
            >
              <option value="">Todos los resultados</option>
              <option value="0">Sin retinopatía</option>
              <option value="1">Retinopatía leve</option>
              <option value="2">Retinopatía moderada</option>
              <option value="3">Retinopatía severa</option>
              <option value="4">Retinopatía proliferativa</option>
            </select>

            <button
              onClick={clearFilters}
              className="w-full px-3 py-2 bg-gray-200 text-gray-700 rounded"
            >
              Limpiar filtros
            </button>
          </div>
        )}

        {hasSelection && (
          <div className="p-4">
            <BulkOperations
              selectedItems={selectedItems}
              totalItems={filteredPacientes.length}
              onSelectAll={selectAll}
              onDeselectAll={deselectAll}
              onDeleteSelected={handleBulkDelete}
              onExportSelected={handleBulkExport}
              onProcessSelected={handleBulkProcess}
              isProcessing={isProcessing}
              onCancelProcessing={() => setIsProcessing(false)}
            />
          </div>
        )}

        <div className="p-4">
          <MobileList
            items={filteredPacientes}
            renderItem={(paciente) => <MobilePacienteCard key={paciente.id} paciente={paciente} />}
            onRefresh={() => buscarPacientes(false)}
            isLoading={isLoading}
            emptyMessage="No hay pacientes que coincidan con los criterios"
          />
        </div>

        {/* Lightbox for mobile */}
        {lightboxOpen && imageSets.length > 0 && (
          <LightboxViewer
            open={lightboxOpen}
            onClose={() => setLightboxOpen(false)}
            sets={imageSets}
            index={lightboxIndex}
            subIndex={subImageIndex}
            setSubIndex={setSubImageIndex}
          />
        )}
      </div>
    );
  }

  // Desktop version
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center">
              <UsersIcon className="w-8 h-8 text-white" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Gestión de Pacientes
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Administre y consulte la información de pacientes registrados
          </p>
          
          {/* Botón para regresar al dashboard */}
          <div className="flex justify-center">
            <BackToHomeButton variant="secondary" size="sm" />
          </div>
        </div>

        {/* Estadísticas rápidas */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Pacientes</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{pacientes.length}</p>
              </div>
              <UsersIcon className="w-8 h-8 text-blue-600" />
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Mostrando</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{filteredPacientes.length}</p>
              </div>
              <FunnelIcon className="w-8 h-8 text-green-600" />
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Seleccionados</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{selectionCount}</p>
              </div>
              <Cog6ToothIcon className="w-8 h-8 text-purple-600" />
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Con Imágenes</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {pacientes.filter(p => p.imagenes && p.imagenes.length > 0).length}
                </p>
              </div>
              <EyeIcon className="w-8 h-8 text-orange-600" />
            </div>
          </div>
        </div>

        {/* Controles principales */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 mb-8">
          <div className="p-6">
            {/* Buscador y filtros */}
            <div className="flex flex-col lg:flex-row gap-4 mb-6">
              <div className="flex-1 relative">
                <input
                  type="text"
                  placeholder="Buscar por DNI, nombre o apellido..."
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                <MagnifyingGlassIcon className="w-5 h-5 text-gray-400 absolute left-3 top-3.5" />
              </div>
              
              <button
                onClick={buscarPacientes}
                disabled={isLoading}
                className={`px-6 py-3 rounded-lg text-white font-medium transition-colors ${
                  isLoading 
                    ? "bg-blue-400 cursor-not-allowed" 
                    : "bg-blue-600 hover:bg-blue-700"
                }`}
              >
                {isLoading ? (
                  <div className="flex items-center">
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                    Buscando...
                  </div>
                ) : (
                  "Buscar"
                )}
              </button>

              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`px-6 py-3 rounded-lg font-medium transition-colors ${
                  showFilters 
                    ? "bg-gray-700 text-white" 
                    : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                }`}
              >
                <FunnelIcon className="w-5 h-5 inline mr-2" />
                Filtros
              </button>
            </div>

            {/* Panel de filtros */}
            {showFilters && (
              <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Tipo de Diabetes
                    </label>
                    <select
                      value={filters.tipo_diabetes}
                      onChange={(e) => handleFilterChange('tipo_diabetes', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                    >
                      <option value="">Todos</option>
                      <option value="tipo1">Tipo 1</option>
                      <option value="tipo2">Tipo 2</option>
                      <option value="desconocido">Desconocido</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Estado Dilatación
                    </label>
                    <select
                      value={filters.estado_dilatacion}
                      onChange={(e) => handleFilterChange('estado_dilatacion', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                    >
                      <option value="">Todos</option>
                      <option value="dilatado">Dilatado</option>
                      <option value="no_dilatado">No dilatado</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Resultado
                    </label>
                    <select
                      value={filters.resultado}
                      onChange={(e) => handleFilterChange('resultado', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                    >
                      <option value="">Todos</option>
                      <option value="0">Sin retinopatía</option>
                      <option value="1">Leve</option>
                      <option value="2">Moderada</option>
                      <option value="3">Severa</option>
                      <option value="4">Proliferativa</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Desde
                    </label>
                    <input
                      type="date"
                      value={filters.fecha_desde}
                      onChange={(e) => handleFilterChange('fecha_desde', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Hasta
                    </label>
                    <input
                      type="date"
                      value={filters.fecha_hasta}
                      onChange={(e) => handleFilterChange('fecha_hasta', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                    />
                  </div>
                </div>

                <div className="flex justify-end mt-4">
                  <button
                    onClick={clearFilters}
                    className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
                  >
                    Limpiar filtros
                  </button>
                </div>
              </div>
            )}

            {/* Operaciones en lote */}
            {hasSelection && (
              <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                <BulkOperations
                  selectedItems={selectedItems}
                  totalItems={filteredPacientes.length}
                  onSelectAll={selectAll}
                  onDeselectAll={deselectAll}
                  onDeleteSelected={handleBulkDelete}
                  onExportSelected={handleBulkExport}
                  onProcessSelected={handleBulkProcess}
                  isProcessing={isProcessing}
                  onCancelProcessing={() => setIsProcessing(false)}
                />
              </div>
            )}
          </div>
        </div>

        {/* Lista de pacientes */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {isLoading && filteredPacientes.length === 0 ? (
            <div className="col-span-full flex items-center justify-center py-12">
              <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mr-3"></div>
              <span className="text-gray-600 dark:text-gray-400">Cargando pacientes...</span>
            </div>
          ) : filteredPacientes.length === 0 ? (
            <div className="col-span-full text-center py-12">
              <UsersIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 text-lg mb-2">No hay pacientes que coincidan</p>
              <p className="text-gray-400 text-sm">Intente ajustar sus criterios de búsqueda o filtros</p>
            </div>
          ) : (
            filteredPacientes.map((p) => (
              <SelectableItem
                key={p.id}
                id={p.id}
                isSelected={isSelected(p.id)}
                onSelect={selectItem}
                className="bg-white dark:bg-gray-800 shadow-sm hover:shadow-md rounded-xl border border-gray-200 dark:border-gray-700 transition-shadow"
              >
                <div className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                        {p.nombres} {p.apellidos}
                      </h3>
                      <div className="space-y-1">
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          <span className="font-medium">HC:</span> {p.historia_clinica}
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          <span className="font-medium">CI:</span> {p.ci}
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          <span className="font-medium">Diabetes:</span> {p.tipo_diabetes || 'N/A'}
                        </p>
                      </div>
                    </div>
                    
                    {p.resultado_texto && (
                      <span
                        className={`px-3 py-1 text-xs rounded-full font-medium ${
                          p.resultado === 0
                            ? "bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400"
                            : "bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400"
                        }`}
                      >
                        {p.resultado_texto}
                      </span>
                    )}
                  </div>

                  {/* Vista previa de imagen */}
                  {Array.isArray(p.imagenes) && p.imagenes.length > 0 && p.imagenes[0].imagen ? (
                    <div className="mb-4">
                      <img
                        src={p.imagenes[0].imagen_procesada || p.imagenes[0].imagen}
                        alt="Imagen procesada"
                        className="w-full h-48 object-cover rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                        onClick={() => {
                          const indexSet = imageSets.findIndex(
                            (set) => set.original === p.imagenes[0].imagen_procesada || p.imagenes[0].imagen
                          );
                          if (indexSet >= 0) handleImageClick(indexSet);
                        }}
                      />
                      <p className="text-xs text-gray-500 mt-1 text-center">
                        {p.imagenes.length} imagen(es) • Click para ampliar
                      </p>
                    </div>
                  ) : (
                    <div className="mb-4 h-48 flex items-center justify-center bg-gray-100 dark:bg-gray-700 rounded-lg">
                      <div className="text-center">
                        <EyeIcon className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                        <p className="text-sm text-gray-500">Sin imágenes</p>
                      </div>
                    </div>
                  )}

                  {/* Información adicional */}
                  <div className="text-xs text-gray-400 dark:text-gray-500 mb-4">
                    Última actualización: {p.actualizado ? new Date(p.actualizado).toLocaleDateString() : "N/D"}
                  </div>

                  {/* Acciones */}
                  <div className="flex gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/pacientes/editar/${p.id}`);
                      }}
                      className="flex-1 flex items-center justify-center px-3 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors text-sm font-medium"
                    >
                      <PencilSquareIcon className="w-4 h-4 mr-1" />
                      Editar
                    </button>
                    
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/patient/${p.id}`);
                      }}
                      className="flex-1 flex items-center justify-center px-3 py-2 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition-colors text-sm font-medium"
                    >
                      <EyeIcon className="w-4 h-4 mr-1" />
                      Ver
                    </button>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deletePaciente(p.id);
                      }}
                      className="px-3 py-2 bg-red-50 text-red-700 rounded-lg hover:bg-red-100 transition-colors"
                    >
                      <TrashIcon className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </SelectableItem>
            ))
          )}
        </div>

        {/* Lightbox para imágenes */}
        {lightboxOpen && imageSets.length > 0 && (
          <LightboxViewer
            open={lightboxOpen}
            onClose={() => setLightboxOpen(false)}
            sets={imageSets}
            index={lightboxIndex}
            subIndex={subImageIndex}
            setSubIndex={setSubImageIndex}
          />
        )}
      </div>
    </div>
  );
};

export default PacienteList;

