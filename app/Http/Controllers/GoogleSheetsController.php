<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
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

        return $rows->reverse()->take(200);
    }

    public function getSpreadSheet($sheetId)
    {
        return $this->getSheetsData($sheetId);
    }

    public function getPaciente($dni)
    {
        $sheetId = 'Pacientes';
        return $this->getSheetsData($sheetId)->firstWhere('Dni', $dni);
    }

    public function getMedicosEspecialidad($especialidad)
    {
        if (Cache::has('MedicosEspecialidad')) {
            return Cache::get('MedicosEspecialidad');
        }

        \Log::info($especialidad);
        $sheetId = 'Medicos';
        $medicos = $this->getSheetsData($sheetId);
        $medicosConEspecialidad = [];
        foreach ($medicos as $key => $medico) {
            if (stripos(preg_replace('/\s+/', '', $medico['Especialidad']), preg_replace('/\s+/', '', $especialidad)) !== false) {
                array_push($medicosConEspecialidad, $key);
            }
        }

        $medicosFiltrados = $medicos->only($medicosConEspecialidad);
        Cache::add('MedicosEspecialidad', $medicosFiltrados->toArray(), 3600);
        return $this->sendResponse($medicosFiltrados->values(), 'Datos de Cargo');
        return $this->sendError('El candidato no posee Función');
    }

    public function getTurnosMedico($idMedico)
    {
        $sheetId = 'TurnosMedicos';
        return $this->getSheetsData($sheetId)->where('IdMedico', $idMedico)->where('Estado', 'Disponible');
    }

    public function getMedicosApellido($apellido)
    {
        $sheetId = 'Medicos';
        $medicos = $this->getSheetsData($sheetId)->where('Apellido', $apellido);
        return $medicos;
    }

    public function getMedicosFecha($fecha)
    {
        $medicos = $this->getSheetsData('Medicos');
        $turnos = $this->getSheetsData('TurnosMedicos')->where('Fecha', $fecha)->where('Estado', 'Disponible');
        $medicosParaFecha = [];
        foreach ($turnos as $turno) {
            if ($turno['Fecha'] === $fecha) {
                array_push($medicosParaFecha, $turno['IdMedico']);
            }
        }

        $medicosToRemove = [];
        foreach ($medicos as $key => $medico) {
            if (!in_array($medico['IdMedico'], $medicosParaFecha)) {
                array_push($medicosToRemove, $key);
            }
        }
        return $medicos->except($medicosToRemove);
    }

    public function getTurnosFechaMedico($fecha, $idMedico)
    {
        $medicos = $this->getSheetsData('Medicos');
        $turnos = $this->getSheetsData('TurnosMedicos')
        ->where('Fecha', \Carbon\Carbon::parse($fecha)->format('Y-m-d'))
        ->where('IdMedico', $idMedico)
        ->where('Estado', 'Disponible');
        foreach ($turnos as $key => $turno) {
            $turno['Apellido'] = $medicos->firstWhere('IdMedico', $turno['IdMedico'])['Apellido'];
            $turno['Nombre'] = $medicos->firstWhere('IdMedico', $turno['IdMedico'])['Nombre'];
            $turno['Especialidad'] = $medicos->firstWhere('IdMedico', $turno['IdMedico'])['Especialidad'];
            $turno['PrecioConsulta'] = $medicos->firstWhere('IdMedico', $turno['IdMedico'])['PrecioConsulta'];
        }
        return $turnos;
    }

    public function getMedicosObraSocial(string $obraSocial)
    {
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
            foreach ($medico['ObrasSociales'] as $os) {
                if (stripos(preg_replace('/\s+/', '', $os), preg_replace('/\s+/', '', $obraSocial)) !== false) {
                    array_push($arrayIdsMedicos, $medico['IdMedico']);
                }
            }
        }

        foreach ($medicos as $key => $medico) {
            if (!in_array($medico['IdMedico'], $arrayIdsMedicos)) {
                array_push($medicosToRemove, $key);
            }
        }
        return $medicos->except($medicosToRemove);
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
                if (stripos(strtoupper(preg_replace('/\s+/', '', $os)), strtoupper(preg_replace('/\s+/', '', $obraSocial))) !== false) {
                    array_push($arrayIdsMedicos, $medico['IdMedico']);
                }
            }
        }

        foreach ($turnos as $key => $turno) {
            if (in_array($turno['IdMedico'], $arrayIdsMedicos)) {
                $turno['Apellido'] = $medicos->firstWhere('IdMedico', $turno['IdMedico'])['Apellido'];
                $turno['Nombre'] = $medicos->firstWhere('IdMedico', $turno['IdMedico'])['Nombre'];
                $turno['Especialidad'] = $medicos->firstWhere('IdMedico', $turno['IdMedico'])['Especialidad'];
            } else {
                array_push($turnosToRemove, $key);
            }
        }
        return $turnos->except($turnosToRemove);
    }

    public function storePaciente(Request $request)
    {
        $datos = $request->all();

        //Registro paciente
        $pacientes = $this->getSheetsData('Pacientes');
        $paciente = $pacientes->firstWhere('DNI', $datos['dni']);
        if (!$paciente) {
            $IdPaciente = $pacientes->first() + 1;
            $paciente = [
                'IdPaciente' => $IdPaciente,
                'Dni' => $datos['Dni'],
                'Apellido' => $datos['Apellido'],
                'Nombre' => $datos['Nombre'],
                'Telefono' => $datos['Telefono'],
                'Correo' => $datos['Correo'],
                'ObraSocial' => $datos['ObraSocial'],
                'NroAfiliado' => $datos['NroAfiliado'],
             ];
            Sheets::spreadsheet($this->spreadSheetId)
              ->sheetById('Pacientes')
              ->append([$paciente]);
        } else {
            $IdPaciente = $pacientes->firstWhere('DNI', $datos['dni'])['IdPaciente'];
        }

        $turnos = $this->getSheetsData('TurnosMedicos')->all();
        foreach ($turnos as $turno) {
            if ((int) $turno['IdTurno'] === (int) $datos['IdTurno']) {
                $turno['Estado'] = 'Ocupado';
                $turno['IdPaciente'] = $IdPaciente;
            }
        }

        //registro turno
        Sheets::spreadsheet($this->spreadSheetId)
              ->sheetById('TurnosMedicos')
              ->update([$turnos]);
    }

    // public function appendDataSheet(Request $request)
    // {
    //     $sheetId = 'TurnosMedicosAsignados';

    //     $datos = $request->all();
    //     $paciente = [
    //       'IdTurno' => 2,
    //       'DNI' => $datos['dni'],
    //       'Apellido' => $datos['apellido'],
    //       'Nombre' => $datos['name'],
    //       'Obra Social' => $datos['obraSocial'],
    //       'Medico' => $datos['medico'],
    //       'turno' => $datos['turno'],
    //       'dia' => $datos['dia'],
    //       'hora' => $datos['hora'],
    //       'Sala' => $datos['sala'],
    //       'Consultorio' => $datos['consultorio']

    //    ];

    //     Sheets::spreadsheet($this->spreadSheetId)
    //           ->sheetById($sheetId)
    //           ->append([$paciente]);
    // }
}
