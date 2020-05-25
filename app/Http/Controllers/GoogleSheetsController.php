<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Google;
use Sheets;
use Illuminate\Support\Facades\Cache;

class GoogleSheetsController extends Controller
{
    private $spreadSheetId = '1xaORRQBAxi4Mly_9yccQvgc2KBVpdMWAJTRBkcXRrMI';

    public function getSheetsData($sheetId)
    {
        $sheets = Sheets::spreadsheet($this->spreadSheetId)
          ->sheet($sheetId)
          ->get();

        $header = $sheets->pull(0);

        $rows = Sheets::collection($header, $sheets);

        return $rows->reverse()->take(168);
    }

    public function getSpreadSheet($sheetId)
    {
        return $this->getSheetsData($sheetId);
    }

    public function getPaciente($DNI)
    {
        $cacheId = 'PacienteDNI'. $DNI;
        if (Cache::has($cacheId)) {
            return $this->sendResponse(Cache::get($cacheId), 'Paciente');
        }

        $sheetId = 'Pacientes';
        $paciente = $this->getSheetsData($sheetId)->firstWhere('DNI', $DNI);
        if (isset($paciente)) {
            Cache::add($cacheId, $paciente, 3600);
            return $this->sendResponse($paciente, 'Paciente');
        }
        
        $this->sendError('No se pudo encontrar el Paciente');
    }

    public function isEqual($property1, $property2)
    {
        return isset($property1, $property2) &&
        stripos(preg_replace('/\s+/', '', $property1), preg_replace('/\s+/', '', $property2)) !== false;
    }

    public function getMedicosEspecialidad($especialidad)
    {
        $cacheId = 'MedicosEspecialidad'. $especialidad;
        if (Cache::has($cacheId)) {
            return $this->sendResponse(Cache::get($cacheId), 'Medicos de Especialidad');
        }

        $sheetId = 'Medicos';
        $medicos = $this->getSheetsData($sheetId);
        $medicosConEspecialidad = [];
        foreach ($medicos as $key => $medico) {
            if ($this->isEqual($medico['Especialidad'], $especialidad)) {
                array_push($medicosConEspecialidad, $key);
            }
        }

        $medicosFiltrados = $medicos->only($medicosConEspecialidad);
        Cache::add($cacheId, $medicosFiltrados->values(), 3600);
        return $this->sendResponse($medicosFiltrados->values(), 'Medicos de Especialidad');
    }

    public function getTurnosMedico($MatriculaProfesional)
    {
        // $cacheId = 'TurnosDeMedico'. $MatriculaProfesional;
        // if (Cache::has($cacheId)) {
        //     return $this->sendResponse(Cache::get($cacheId), 'Turnos');
        // }

        $sheetId = 'TurnosMedicos';
        $turnos = $this->getSheetsData($sheetId)
            ->where('MatriculaProfesional', $MatriculaProfesional)
            ->where('Estado', 'Disponible')
            ->values();
        // Cache::add($cacheId, $turnos->values(), 3600);
        return $this->sendResponse($turnos, 'Turnos');
    }

    public function getMedicosApellido($apellido)
    {
        $sheetId = 'Medicos';
        $medicos = $this->getSheetsData($sheetId);
        foreach ($medicos as $medico) {
            if ($this->isEqual($medico['ApellidoNombre'], $apellido)) {
                return $this->sendResponse($medico, 'Medico por Apellido');
            }
        }
        return $this->sendError('No se pudo encontrar el médico');
    }

    public function getMedicosFecha($fecha)
    {
        $medicos = $this->getSheetsData('Medicos');
        $turnos = $this->getSheetsData('TurnosMedicos')->where('Fecha', $fecha)->where('Estado', 'Disponible');
        $medicosParaFecha = [];
        foreach ($turnos as $turno) {
            if ($turno['Fecha'] === $fecha) {
                array_push($medicosParaFecha, $turno['MatriculaProfesional']);
            }
        }

        $medicosToRemove = [];
        foreach ($medicos as $key => $medico) {
            if (!in_array($medico['MatriculaProfesional'], $medicosParaFecha)) {
                array_push($medicosToRemove, $key);
            }
        }
        return $medicos->except($medicosToRemove);
    }

    public function getTurnos($fecha)
    {
        $fechaFormateada = \Carbon\Carbon::parse($fecha)->format('Y-m-d');
        // $cacheId = 'TurnosFecha'. $fecha;

        // if (Cache::has($cacheId)) {
        //     return $this->sendResponse(Cache::get($cacheId), 'Medicos');
        // }

        $medicos = $this->getSheetsData('Medicos');
        $sheetId = 'TurnosMedicos';
        $turnos = $this->getSheetsData($sheetId)
                ->where('Fecha', $fechaFormateada)
                ->where('Estado', 'Disponible');
        foreach ($turnos as $turno) {
            $turno['ApellidoNombre'] = $medicos->firstWhere('MatriculaProfesional', $turno['MatriculaProfesional'])['ApellidoNombre'];
            $turno['Especialidad'] = $medicos->firstWhere('MatriculaProfesional', $turno['MatriculaProfesional'])['Especialidad'];
            $turno['PrecioConsulta'] = $medicos->firstWhere('MatriculaProfesional', $turno['MatriculaProfesional'])['PrecioConsulta'];
        }
        // Cache::add($cacheId, $turnos->values(), 3600);
        return $this->sendResponse($turnos->values(), 'Turnos de Médico');
    }

    public function isTurno($numero)
    {
        $sheetId = 'TurnosMedicos';
        // $cacheId = 'TurnoExiste'. $numero;

        // if (Cache::has($cacheId)) {
        //     return $this->sendResponse(Cache::get($cacheId), 'Medicos');
        // }

        $turno = $this->getSheetsData($sheetId)
                ->where('IdTurno', $numero)
                ->where('Estado', 'Disponible')
                ->first();
        // Cache::add($cacheId, $turno, 3600);
        return isset($turno) ?
        $this->sendResponse($turno, 'Turno Correcto') :
        $this->sendError('No se pudo encontrar el turno');
    }

    public function isObraSocialDeMedico(string $apellido, string $obraSocial)
    {
        $sheetId = 'Medicos';
        $medico = $this->getSheetsData($sheetId)
                ->firstWhere('ApellidoNombre', $apellido);
        return isset($medico) && $this->isEqual($medico['ObrasSociales'], $obraSocial) ?
        $this->sendResponse($medico, 'Médico con Obra Social Correcto') :
        $this->sendError('El médico no posee la Obra Social elegida');
    }

    public function getTurnosFechaMedico($fecha, $MatriculaProfesional = null)
    {
        if (isset($MatriculaProfesional)) {
            // $cacheId = 'TurnosMedico'. $fecha . $MatriculaProfesional;

            // if (Cache::has($cacheId)) {
            //     return $this->sendResponse(Cache::get($cacheId), 'Medicos');
            // }
            $fechaFormateada = \Carbon\Carbon::parse($fecha)->format('Y-m-d');
            $medicos = $this->getSheetsData('Medicos');
            $sheetId = 'TurnosMedicos';
            $turnos = $this->getSheetsData($sheetId)
                ->where('Fecha', $fechaFormateada)
                ->where('MatriculaProfesional', $MatriculaProfesional)
                ->where('Estado', 'Disponible');

            $medico = $medicos->firstWhere('MatriculaProfesional', $MatriculaProfesional);
            foreach ($turnos as $turno) {
                $turno['ApellidoNombre'] = $medico['ApellidoNombre'];
                $turno['Especialidad'] = $medico['Especialidad'];
                $turno['PrecioConsulta'] = $medico['PrecioConsulta'];
            }
            // Cache::add($cacheId, $turnos->values(), 3600);
            return $this->sendResponse($turnos->values(), 'Turnos de Médico');
        } else {
            return $this->getTurnos($fecha);
        }
    }

    public function getTurnosApellidoFecha(string $apellido, string $fecha)
    {
        // $cacheId = 'TurnosApellidoNombreFecha'. $apellido . $fecha;

        // if (Cache::has($cacheId)) {
        //     return $this->sendResponse(Cache::get($cacheId), 'Medicos');
        // }
        $fechaFormateada = \Carbon\Carbon::parse($fecha)->format('Y-m-d');
        $medico = $this->getSheetsData('Medicos')->firstWhere('ApellidoNombre', $apellido);
        $sheetId = 'TurnosMedicos';
        $turnos = $this->getSheetsData($sheetId)
                // ->where('Fecha', $fechaFormateada)
                ->where('MatriculaProfesional', $medico['MatriculaProfesional'])
                ->where('Estado', 'Disponible');

        $turnosToRemove = [];
        foreach ($turnos as $key => $turno) {
            if ($this->isEqual($turno['Fecha'], $fechaFormateada)) {
                $turno['ApellidoNombre'] = $medico['ApellidoNombre'];
                $turno['Especialidad'] = $medico['Especialidad'];
                $turno['PrecioConsulta'] = $medico['PrecioConsulta'];
            } else {
                array_push($turnosToRemove, $key);
            }
        }
        // Cache::add($cacheId, $turnos->except($turnosToRemove)->values(), 3600);
        return $this->sendResponse($turnos->except($turnosToRemove)->values(), 'Turnos de Médico');
    }

    public function getMedicosFechaEspecialidad(string $fecha, string $especialidad)
    {
        $cacheId = 'MedicosFechayEspecialidad'. $fecha . $especialidad;

        if (Cache::has($cacheId)) {
            return $this->sendResponse(Cache::get($cacheId), 'Medicos');
        }
        $fechaFormateada = \Carbon\Carbon::parse($fecha)->format('Y-m-d');
        $medicos = $this->getSheetsData('Medicos');
        $sheetId = 'TurnosMedicos';
        $turnos = $this->getSheetsData($sheetId)
                ->where('Fecha', $fechaFormateada)
                ->where('Estado', 'Disponible');
        $medicosToRemove = [];
        foreach ($medicos as $key => $medico) {
            if ($turnos->firstWhere('MatriculaProfesional', $medico['MatriculaProfesional']) !== null &&
            $this->isEqual($medico['Especialidad'], $especialidad)) {
            } else {
                array_push($medicosToRemove, $key);
            }
        }
        Cache::add($cacheId, $medicos->except($medicosToRemove)->values(), 3600);
        return $this->sendResponse($medicos->except($medicosToRemove)->values(), 'Médicos de Especialidad y fecha');
    }

    public function getTurnosFecha($anio, $mes, $dia)
    {
        return $this->getTurnos($anio . '-' . $mes . '-' . $dia);
    }

    public function getMedicosObraSocial(string $obraSocial, string $especialidad)
    {
        $cacheId = 'MedicosObraSocialEsp'. $obraSocial . $especialidad;

        if (Cache::has($cacheId)) {
            return $this->sendResponse(Cache::get($cacheId), 'Medicos');
        }
        $medicos = $this->getSheetsData('Medicos');
        $medicos = $medicos->map(function ($item, $key) {
            if (isset($item['ObrasSociales'])) {
                if (strpos($item['ObrasSociales'], ',')) {
                    $item['ObrasSociales'] = explode(", ", $item['ObrasSociales']);
                } else {
                    $item['ObrasSociales'] = [$item['ObrasSociales']];
                }
            }
            return $item;
        });
        $medicosToRemove = [];
        $arrayIdsMedicos = [];
        foreach ($medicos as $medico) {
            if ($this->isEqual($medico['Especialidad'], $especialidad)) {
                foreach ($medico['ObrasSociales'] as $os) {
                    if ($this->isEqual($os, $obraSocial)) {
                        array_push($arrayIdsMedicos, $medico['MatriculaProfesional']);
                    }
                }
            }
        }

        foreach ($medicos as $key => $medico) {
            if (!in_array($medico['MatriculaProfesional'], $arrayIdsMedicos)) {
                array_push($medicosToRemove, $key);
            }
        }
        
        $medicosFiltrados = $medicos->except($medicosToRemove)->values();
        Cache::add($cacheId, $medicosFiltrados, 3600);
        return $this->sendResponse($medicosFiltrados, 'Medicos de OS y Especialidad');
    }

    public function getTurnosObraSocial(string $obraSocial)
    {
        $medicos = $this->getSheetsData('Medicos');
        $turnos = $this->getSheetsData('TurnosMedicos')->where('Estado', 'Disponible');
        $medicos = $medicos->map(function ($item, $key) {
            if (isset($item['ObrasSociales'])) {
                if (strpos($item['ObrasSociales'], ',')) {
                    $item['ObrasSociales'] = explode(", ", $item['ObrasSociales']);
                } else {
                    $item['ObrasSociales'] = [$item['ObrasSociales']];
                }
            }
            return $item;
        });
        $turnosToRemove = [];
        $arrayIdsMedicos = [];
        foreach ($medicos as $medico) {
            foreach ($medico['ObrasSociales'] as $os) {
                if ($this->isEqual($os, $obraSocial)) {
                    array_push($arrayIdsMedicos, $medico['MatriculaProfesional']);
                }
            }
        }

        foreach ($turnos as $key => $turno) {
            if (in_array($turno['MatriculaProfesional'], $arrayIdsMedicos)) {
                $turno['ApellidoNombre'] = $medicos->firstWhere('MatriculaProfesional', $turno['MatriculaProfesional'])['ApellidoNombre'];
                $turno['Especialidad'] = $medicos->firstWhere('MatriculaProfesional', $turno['MatriculaProfesional'])['Especialidad'];
            } else {
                array_push($turnosToRemove, $key);
            }
        }
        return $turnos->except($turnosToRemove);
    }

    public function storePaciente($dni, $idTurno)
    {
        //Registro paciente
        $pacientes = $this->getSheetsData('Pacientes');
        $paciente = $pacientes->firstWhere('DNI', $dni);
        $turnoAsignado = null;
        $turnos = $this->getSheetsData('TurnosMedicos');
        foreach ($turnos as $key => $turno) {
            if ((int) $turno['IdTurno'] === (int) $idTurno) {
                $fila = $key + 1;
                $turnoAsignado = $turno;
                break;
            }
        }

        if (isset($turnoAsignado)) {
            $medico = $this->getSheetsData('Medicos')->firstWhere('MatriculaProfesional', $turnoAsignado['MatriculaProfesional']);
            $sede = $this->getSheetsData('Sedes')->firstWhere('IdSede', $turnoAsignado['IdSede']);
            $datos = [
                'Paciente' => (isset($paciente) ? $paciente['ApellidoNombre'] : false),
                'Fecha' => $turnoAsignado['Fecha'],
                'HoraInicio' => $turnoAsignado['HoraInicio'],
                'ApellidoNombre' => $medico['ApellidoNombre'],
                'Direccion' => $sede['Direccion'],
                'Piso' => $sede['Piso'],
                'Consultorio' => $sede['Consultorio'],
                'IdTurno' => $turnoAsignado['IdTurno'],
                'Fila' => $fila
            ];
            return $this->sendResponse($datos, 'Turno Asignado');
        }
        return $this->sendError('No se pudo asignar el turno');
    }
}
