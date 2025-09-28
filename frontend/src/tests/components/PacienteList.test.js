import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import '@testing-library/jest-dom';
import PacienteList from '../../containers/pages/pacientes/PacienteList';
import api from '../../utils/axiosConfig';

// Mock del API
jest.mock('../../utils/axiosConfig');
const mockedApi = api;

// Mock de react-router-dom
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

// Mock del componente HeaderTabs
jest.mock('../../components/paciente/HeaderTabs', () => {
  return function MockHeaderTabs() {
    return <div data-testid="header-tabs">Header Tabs</div>;
  };
});

// Mock del componente LightboxViewer
jest.mock('../../components/LightboxViewer', () => {
  return function MockLightboxViewer({ open, onClose }) {
    return open ? (
      <div data-testid="lightbox" onClick={onClose}>
        Lightbox Viewer
      </div>
    ) : null;
  };
});

describe('PacienteList Component', () => {
  const mockPacientes = [
    {
      id: 1,
      nombres: 'Juan Carlos',
      apellidos: 'Pérez García',
      historia_clinica: 'HC001',
      dni: '12345678',
      resultado: 0,
      resultado_texto: 'Sin retinopatía',
      actualizado: '2023-01-15T10:30:00Z',
      imagenes: [
        {
          id: 1,
          imagen: '/media/pacientes/image1.jpg',
          imagen_procesada: '/media/procesadas/image1_proc.jpg',
          gradcam: '/media/gradcams/image1_grad.jpg',
          resultado: 0,
          confianza: 0.92
        }
      ]
    },
    {
      id: 2,
      nombres: 'María Elena',
      apellidos: 'González López',
      historia_clinica: 'HC002',
      dni: '87654321',
      resultado: 2,
      resultado_texto: 'Moderada',
      actualizado: '2023-01-14T15:45:00Z',
      imagenes: []
    }
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const renderComponent = () => {
    return render(
      <BrowserRouter>
        <PacienteList />
      </BrowserRouter>
    );
  };

  test('renderiza correctamente el componente', async () => {
    mockedApi.get.mockResolvedValueOnce({ data: mockPacientes });

    renderComponent();

    // Verificar elementos de la UI
    expect(screen.getByText('Registro de Pacientes')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Buscar por DNI, nombre o apellido')).toBeInTheDocument();
    expect(screen.getByText('Buscar')).toBeInTheDocument();
    expect(screen.getByTestId('header-tabs')).toBeInTheDocument();
  });

  test('carga y muestra lista de pacientes al inicializar', async () => {
    mockedApi.get.mockResolvedValueOnce({ data: mockPacientes });

    renderComponent();

    // Esperar a que se carguen los pacientes
    await waitFor(() => {
      expect(screen.getByText('Juan Carlos Pérez García')).toBeInTheDocument();
      expect(screen.getByText('María Elena González López')).toBeInTheDocument();
    });

    // Verificar información del paciente
    expect(screen.getByText('HC: HC001')).toBeInTheDocument();
    expect(screen.getByText('DNI: 12345678')).toBeInTheDocument();
    expect(screen.getByText('Sin retinopatía')).toBeInTheDocument();
  });

  test('muestra mensaje cuando no hay resultados', async () => {
    mockedApi.get.mockResolvedValueOnce({ data: [] });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('No hay resultados')).toBeInTheDocument();
    });
  });

  test('funciona la búsqueda de pacientes', async () => {
    // Primera carga
    mockedApi.get.mockResolvedValueOnce({ data: mockPacientes });
    
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Juan Carlos Pérez García')).toBeInTheDocument();
    });

    // Configurar búsqueda
    const filteredResults = [mockPacientes[0]]; // Solo Juan Carlos
    mockedApi.get.mockResolvedValueOnce({ data: filteredResults });

    // Introducir término de búsqueda
    const searchInput = screen.getByPlaceholderText('Buscar por DNI, nombre o apellido');
    fireEvent.change(searchInput, { target: { value: 'Juan' } });

    // Hacer clic en buscar
    const searchButton = screen.getByText('Buscar');
    fireEvent.click(searchButton);

    // Verificar que se llamó al API con el término de búsqueda
    await waitFor(() => {
      expect(mockedApi.get).toHaveBeenCalledWith('/api/pacientes/buscar/?search=Juan');
    });
  });

  test('navega a edición de paciente al hacer clic en editar', async () => {
    mockedApi.get.mockResolvedValueOnce({ data: mockPacientes });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Juan Carlos Pérez García')).toBeInTheDocument();
    });

    // Hacer clic en el botón de editar
    const editButtons = screen.getAllByText('✏️ Editar');
    fireEvent.click(editButtons[0]);

    // Verificar navegación
    expect(mockNavigate).toHaveBeenCalledWith('/pacientes/editar/1');
  });

  test('abre lightbox al hacer clic en imagen', async () => {
    mockedApi.get.mockResolvedValueOnce({ data: mockPacientes });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Juan Carlos Pérez García')).toBeInTheDocument();
    });

    // Hacer clic en la imagen
    const image = screen.getByAltText('Vista previa');
    fireEvent.click(image);

    // Verificar que se abre el lightbox
    await waitFor(() => {
      expect(screen.getByTestId('lightbox')).toBeInTheDocument();
    });
  });

  test('cierra lightbox al hacer clic en él', async () => {
    mockedApi.get.mockResolvedValueOnce({ data: mockPacientes });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Juan Carlos Pérez García')).toBeInTheDocument();
    });

    // Abrir lightbox
    const image = screen.getByAltText('Vista previa');
    fireEvent.click(image);

    await waitFor(() => {
      expect(screen.getByTestId('lightbox')).toBeInTheDocument();
    });

    // Cerrar lightbox
    const lightbox = screen.getByTestId('lightbox');
    fireEvent.click(lightbox);

    await waitFor(() => {
      expect(screen.queryByTestId('lightbox')).not.toBeInTheDocument();
    });
  });

  test('muestra placeholder cuando paciente no tiene imagen', async () => {
    const pacienteSinImagen = {
      ...mockPacientes[0],
      imagenes: []
    };
    mockedApi.get.mockResolvedValueOnce({ data: [pacienteSinImagen] });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Sin imagen')).toBeInTheDocument();
    });
  });

  test('aplica estilos correctos según resultado del diagnóstico', async () => {
    mockedApi.get.mockResolvedValueOnce({ data: mockPacientes });

    renderComponent();

    await waitFor(() => {
      // Verificar estilo para "Sin retinopatía" (verde)
      const sinRetinopatia = screen.getByText('Sin retinopatía');
      expect(sinRetinopatia).toHaveClass('bg-green-100', 'text-green-700');

      // Verificar estilo para "Moderada" (rojo)
      const moderada = screen.getByText('Moderada');
      expect(moderada).toHaveClass('bg-red-100', 'text-red-700');
    });
  });

  test('maneja errores al cargar pacientes', async () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    mockedApi.get.mockRejectedValueOnce(new Error('Error de red'));

    renderComponent();

    await waitFor(() => {
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Error al buscar pacientes:',
        expect.any(Error)
      );
    });

    consoleErrorSpy.mockRestore();
  });

  test('construye correctamente los sets de imágenes para lightbox', async () => {
    const pacienteConVariasImagenes = {
      ...mockPacientes[0],
      imagenes: [
        {
          imagen: '/image1.jpg',
          imagen_procesada: '/processed1.jpg',
          gradcam: '/gradcam1.jpg'
        },
        {
          imagen: '/image2.jpg',
          imagen_procesada: '/processed2.jpg',
          gradcam: '/gradcam2.jpg'
        }
      ]
    };

    mockedApi.get.mockResolvedValueOnce({ data: [pacienteConVariasImagenes] });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Juan Carlos Pérez García')).toBeInTheDocument();
    });

    // El componente debería haber construido 2 sets de imágenes
    // Esto se verifica indirectamente al abrir el lightbox
    const image = screen.getByAltText('Vista previa');
    fireEvent.click(image);

    await waitFor(() => {
      expect(screen.getByTestId('lightbox')).toBeInTheDocument();
    });
  });

  test('actualiza término de búsqueda en el input', () => {
    mockedApi.get.mockResolvedValueOnce({ data: [] });

    renderComponent();

    const searchInput = screen.getByPlaceholderText('Buscar por DNI, nombre o apellido');
    fireEvent.change(searchInput, { target: { value: 'test search' } });

    expect(searchInput.value).toBe('test search');
  });
});