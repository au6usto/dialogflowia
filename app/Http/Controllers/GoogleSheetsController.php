<?php

namespace App\Http\Controllers;

use Sheets;
use Illuminate\Support\Facades\Cache;
use Carbon\Carbon;

class GoogleSheetsController extends Controller
{
    const SPREADSHEET_ID = '1xaORRQBAxi4Mly_9yccQvgc2KBVpdMWAJTRBkcXRrMI';

    const MEDICOS_SHEET = 'Medicos';

    const TURNOS_SHEET = 'TurnosMedicos';

    const SEDES_SHEET = 'Sedes';

    const PACIENTES_SHEET = 'Pacientes';

    const ESPECIALIDADES_SHEET = 'Especialidades';


    public function getSheetsData($sheetId)
    {
        $sheets = Sheets::spreadsheet(self::SPREADSHEET_ID)
          ->sheet($sheetId)
          ->get();

        $header = $sheets->pull(0);

        $rows = Sheets::collection($header, $sheets);

        return $rows->reverse()->take(500);
    }

    public function getSpreadSheet($sheetId)
    {
        $sheet = $this->getSheetsData($sheetId);
        return isset($sheet) ?
        $this->sendResponse($sheet, 'Paciente') :
        $this->sendError('No se pudo encontrar el Paciente');
    }

    public function getPaciente($DNI)
    {
        $cacheId = 'PacienteDNI'. $DNI;
        if (Cache::has($cacheId)) {
            return $this->sendResponse(Cache::get($cacheId), 'Paciente');
        }

        $paciente = $this->getSheetsData(self::PACIENTES_SHEET)->firstWhere('DNI', $DNI);
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
        $medicosFiltrados = $this->getSheetsData(self::MEDICOS_SHEET)->filter(function ($item, $key) use ($especialidad) {
            if ($this->isEqual($item['Especialidad'], $especialidad)) {
                return $item;
            }
        })
        ->values();
        Cache::add($cacheId, $medicosFiltrados, 3600);
        return $this->sendResponse($medicosFiltrados, 'Medicos de Especialidad');
    }

    public function getTurnosMedico($MatriculaProfesional)
    {
        $turnos = $this->getSheetsData(self::TURNOS_SHEET)
            ->where('MatriculaProfesional', $MatriculaProfesional)
            ->where('Estado', 'Disponible')
            ->where('Fecha', '>=', date('Y-m-d'))
            ->values();
        return $this->sendResponse($turnos, 'Turnos');
    }

    public function getMedicosApellido($apellido)
    {
        $medicos = $this->getSheetsData(self::MEDICOS_SHEET);
        $medico = $medicos->search(function ($item, $key) use ($apellido) {
            return $this->isEqual($item['ApellidoNombre'], $apellido);
        });
        return $this->sendResponse($medicos->get($medico), 'Medico por Apellido');
    }

    public function getMedicosFecha($fecha)
    {
        $fechaFormateada = Carbon::parse($fecha)->format('Y-m-d');
        $turnos = $this->getSheetsData(self::TURNOS_SHEET)
        ->where('Estado', 'Disponible')
        ->where('Fecha', $fechaFormateada)
        ->pluck('MatriculaProfesional', 'MatriculaProfesional')
        ->toArray();

        $medicos = $this->getSheetsData(self::MEDICOS_SHEET)
            ->filter(function ($item, $key) use ($turnos) {
                if (in_array($item['MatriculaProfesional'], $turnos)) {
                    return $item;
                }
            })
            ->values();
        return $this->sendResponse($medicos, 'Medico por Fecha');
    }

    public function getTurnos($fecha)
    {
        $fechaFormateada = Carbon::parse($fecha)->format('Y-m-d');
        $medicos = $this->getSheetsData(self::MEDICOS_SHEET);
        $turnos = $this->getSheetsData(self::TURNOS_SHEET)
                ->where('Fecha', $fechaFormateada)
                ->where('Fecha', '>=', date('Y-m-d'))
                ->where('Estado', 'Disponible')
                ->map(function ($item, $key) use ($medicos) {
                    $item['ApellidoNombre'] = $medicos->firstWhere('MatriculaProfesional', $item['MatriculaProfesional'])['ApellidoNombre'];
                    $item['Especialidad'] = $medicos->firstWhere('MatriculaProfesional', $item['MatriculaProfesional'])['Especialidad'];
                    $item['PrecioConsulta'] = $medicos->firstWhere('MatriculaProfesional', $item['MatriculaProfesional'])['PrecioConsulta'];
                    return $item;
                });

        return $this->sendResponse($turnos->values(), 'Turnos de Médico');
    }

    public function isTurnoMedicoFecha($idTurno, $apellido, $fecha)
    {
        $fechaFormateada = Carbon::parse($fecha)->format('Y-m-d');
        $medico = $this->getSheetsData(self::MEDICOS_SHEET)
            ->firstWhere('ApellidoNombre', $apellido);
        $turno = $this->getSheetsData(self::TURNOS_SHEET)
                ->where('IdTurno', $idTurno)
                ->where('Estado', 'Disponible')
                ->where('Fecha', $fechaFormateada)
                ->where('MatriculaProfesional', $medico['MatriculaProfesional'])
                ->first();
        return isset($turno) ?
        $this->sendResponse($turno, 'Turno Correcto') :
        $this->sendError('No se pudo encontrar el turno');
    }

    public function isTurno($numero)
    {
        $turno = $this->getSheetsData(self::TURNOS_SHEET)
                ->where('IdTurno', $numero)
                ->where('Estado', 'Disponible')
                ->first();
        return isset($turno) ?
        $this->sendResponse($turno, 'Turno Correcto') :
        $this->sendError('No se pudo encontrar el turno');
    }

    public function isObraSocialDeMedico(string $apellido, string $obraSocial)
    {
        $medico = $this->getSheetsData(self::MEDICOS_SHEET)
                ->firstWhere('ApellidoNombre', $apellido);
        return isset($medico) && $this->isEqual($medico['ObrasSociales'], $obraSocial) ?
        $this->sendResponse($medico, 'Médico con Obra Social Correcto') :
        $this->sendError('El médico no posee la Obra Social elegida');
    }

    public function getTurnosFechaMedico($fecha, $MatriculaProfesional = null)
    {
        if (isset($MatriculaProfesional)) {
            $fechaFormateada = Carbon::parse($fecha)->format('Y-m-d');
            $medicos = $this->getSheetsData(self::MEDICOS_SHEET);
            $medico = $medicos->firstWhere('MatriculaProfesional', $MatriculaProfesional);
            $turnos = $this->getSheetsData(self::TURNOS_SHEET)
                ->where('Fecha', $fechaFormateada)
                ->where('MatriculaProfesional', $MatriculaProfesional)
                ->where('Fecha', '>=', date('Y-m-d'))
                ->where('Estado', 'Disponible')
                ->map(function ($item, $key) use ($medico) {
                    $item['ApellidoNombre'] = $medico['ApellidoNombre'];
                    $item['Especialidad'] = $medico['Especialidad'];
                    $item['PrecioConsulta'] = $medico['PrecioConsulta'];
                    return $item;
                })
                ->values();
            return $this->sendResponse($turnos, 'Turnos de Médico');
        } else {
            return $this->getTurnos($fecha);
        }
    }

    public function getTurnosApellidoFecha(string $apellido, string $fecha)
    {
        $fechaFormateada = Carbon::parse($fecha)->format('Y-m-d');
        $medico = $this->getSheetsData(self::MEDICOS_SHEET)->firstWhere('ApellidoNombre', $apellido);
        if (isset($medico)) {
            $turnos = $this->getSheetsData(self::TURNOS_SHEET)
                ->where('Fecha', $fechaFormateada)
                ->where('MatriculaProfesional', $medico['MatriculaProfesional'])
                ->where('Fecha', '>=', date('Y-m-d'))
                ->where('Estado', 'Disponible')
                ->map(function ($item, $key) use ($medico) {
                    $item['ApellidoNombre'] = $medico['ApellidoNombre'];
                    $item['Especialidad'] = $medico['Especialidad'];
                    $item['PrecioConsulta'] = $medico['PrecioConsulta'];
                    return $item;
                })
                ->values();
            return $this->sendResponse($turnos, 'Turnos de Médico');
        }
        return $this->sendError('No se encontró ningún turno para la fecha elegida');
    }

    public function getMedicosFechaEspecialidad(string $fecha, string $especialidad)
    {
        $fechaFormateada = Carbon::parse($fecha)->format('Y-m-d');
        $turnos = $this->getSheetsData(self::TURNOS_SHEET)
                ->where('Fecha', $fechaFormateada)
                ->where('Estado', 'Disponible')
                ->pluck('MatriculaProfesional', 'MatriculaProfesional')
                ->toArray();
        $medicos = $this->getSheetsData(self::MEDICOS_SHEET)
                ->filter(function ($item, $key) use ($turnos, $especialidad) {
                    return $this->isEqual($item['Especialidad'], $especialidad) && in_array($item['MatriculaProfesional'], $turnos);
                })
                ->values();

        return $this->sendResponse($medicos, 'Médicos de Especialidad y fecha');
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

        $medicosFiltrados = $this->getSheetsData(self::MEDICOS_SHEET)->filter(function ($item, $key) use ($obraSocial , $especialidad) {
            return $this->isEqual($item['ObrasSociales'], $obraSocial) && $this->isEqual($item['Especialidad'], $especialidad);
        })
        ->values();

        Cache::add($cacheId, $medicosFiltrados, 3600);
        return $this->sendResponse($medicosFiltrados, 'Medicos de OS y Especialidad');
    }

    public function getTurnosObraSocial(string $obraSocial)
    {
        $medicos = $this->getSheetsData(self::MEDICOS_SHEET)->filter(function ($item, $key) use ($obraSocial) {
            return $this->isEqual($item['ObrasSociales'], $obraSocial);
        });
        $matriculas = $medicos->pluck('MatriculaProfesional', 'MatriculaProfesional')->toArray();
        $turnos = $this->getSheetsData(self::TURNOS_SHEET)
        ->where('Estado', 'Disponible')
        ->where('Fecha', '>=', date('Y-m-d'))
        ->filter(function ($item, $key) use ($medicos, $matriculas) {
            if (in_array($item['MatriculaProfesional'], $matriculas)) {
                $item['ApellidoNombre'] = $medicos->firstWhere('MatriculaProfesional', $item['MatriculaProfesional'])['ApellidoNombre'];
                $item['Especialidad'] = $medicos->firstWhere('MatriculaProfesional', $item['MatriculaProfesional'])['Especialidad'];
                return $item;
            }
        })
        ->values();

        return $this->sendResponse($turnos, 'Turnos disponible por Obra Social');
    }

    public function storePaciente($dni, $idTurno)
    {
        //Registro paciente
        $pacientes = $this->getSheetsData(self::PACIENTES_SHEET);
        $paciente = $pacientes->firstWhere('DNI', $dni);
        $turnoAsignado = null;
        $turnos = $this->getSheetsData(self::TURNOS_SHEET);
        foreach ($turnos as $key => $turno) {
            if ((int) $turno['IdTurno'] === (int) $idTurno) {
                $fila = $key + 1;
                $turnoAsignado = $turno;
                break;
            }
        }

        if (isset($turnoAsignado)) {
            $medico = $this->getSheetsData(self::MEDICOS_SHEET)->firstWhere('MatriculaProfesional', $turnoAsignado['MatriculaProfesional']);
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

    public function cancelarTurno($dni, $idTurno)
    {
        $nroTurno = $this->getSheetsData(self::TURNOS_SHEET)
            ->where('Estado', 'Ocupado')
            ->where('DNI', $dni)
            ->search(function ($item, $key) use ($idTurno) {
                return (int) $item['IdTurno'] === (int) $idTurno;
            });

        if (isset($nroTurno)) {
            $datos = [
                'Fila' => $nroTurno + 1
            ];
            return $this->sendResponse($datos, 'Turno Cancelado');
        }
        return $this->sendError('No se pudo cancelar el turno');
    }

    public function getTurnosPaciente($dni)
    {
        $turnos = $this->getSheetsData(self::TURNOS_SHEET)
            ->where('Estado', 'Ocupado')
            ->where('DNI', $dni)
            ->where('Fecha', '>=', date('Y-m-d'))
            ->map(function ($item, $key) {
                $sede = $this->getSheetsData('Sedes')->firstWhere('IdSede', $item['IdSede']);
                $medico = $this->getSheetsData(self::MEDICOS_SHEET)->firstWhere('MatriculaProfesional', $item['MatriculaProfesional']);
                $item['ApellidoNombre'] = $medico['ApellidoNombre'];
                $item['Especialidad'] = $medico['Especialidad'];
                $item['Sede'] = $sede['Direccion'];
                return $item;
            })
            ->values();

        return $this->sendResponse($turnos, 'Turnos de Paciente');
    }
}
