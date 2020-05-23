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

    public function getPaciente($DNI)
    {
        $sheetId = 'Pacientes';
        return $this->getSheetsData($sheetId)->firstWhere('DNI', $DNI);
    }

    public function getMedicosEspecialidad($especialidad)
    {
        if (Cache::has('MedicosEspecialidad'. $especialidad)) {
            return $this->sendResponse(Cache::get('MedicosEspecialidad'. $especialidad), 'Medicos de Especialidad');
        }

        $sheetId = 'Medicos';
        $medicos = $this->getSheetsData($sheetId);
        $medicosConEspecialidad = [];
        foreach ($medicos as $key => $medico) {
            if (stripos(preg_replace('/\s+/', '', $medico['Especialidad']), preg_replace('/\s+/', '', $especialidad)) !== false) {
                array_push($medicosConEspecialidad, $key);
            }
        }

        $medicosFiltrados = $medicos->only($medicosConEspecialidad);
        Cache::add('MedicosEspecialidad'. $especialidad, $medicosFiltrados->values(), 3600);
        return $this->sendResponse($medicosFiltrados->values(), 'Medicos de Especialidad');
    }

    public function getTurnosMedico($MatriculaProfesional)
    {
        $sheetId = 'TurnosMedicos';
        return $this->getSheetsData($sheetId)->where('MatriculaProfesional', $MatriculaProfesional)->where('Estado', 'Disponible');
    }

    public function getMedicosApellido($apellido)
    {
        $sheetId = 'Medicos';
        $medicos = $this->getSheetsData($sheetId);
        foreach ($medicos as $medico) {
            if (isset($medico['ApellidoNombre']) && stripos(preg_replace('/\s+/', '', $medico['ApellidoNombre']), preg_replace('/\s+/', '', $apellido)) !== false) {
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

    public function getTurnosFechaMedico($fecha, $MatriculaProfesional)
    {
        $medicos = $this->getSheetsData('Medicos');
        $turnos = $this->getSheetsData('TurnosMedicos')
        ->where('Fecha', \Carbon\Carbon::parse($fecha)->format('Y-m-d'))
        ->where('MatriculaProfesional', $MatriculaProfesional)
        ->where('Estado', 'Disponible');
        foreach ($turnos as $key => $turno) {
            $turno['ApellidoNombre'] = $medicos->firstWhere('MatriculaProfesional', $turno['MatriculaProfesional'])['ApellidoNombre'];
            $turno['Especialidad'] = $medicos->firstWhere('MatriculaProfesional', $turno['MatriculaProfesional'])['Especialidad'];
            $turno['PrecioConsulta'] = $medicos->firstWhere('MatriculaProfesional', $turno['MatriculaProfesional'])['PrecioConsulta'];
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
                    array_push($arrayIdsMedicos, $medico['MatriculaProfesional']);
                }
            }
        }

        foreach ($medicos as $key => $medico) {
            if (!in_array($medico['MatriculaProfesional'], $arrayIdsMedicos)) {
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

    public function storePaciente(Request $request)
    {
        $datos = $request->all();

        //Registro paciente
        $pacientes = $this->getSheetsData('Pacientes');
        $paciente = $pacientes->firstWhere('DNI', $datos['DNI']);
        if (!$paciente) {
            $IdPaciente = $paciente['DNI'];
            $paciente = [
                'DNI' => $datos['DNI'],
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
            $IdPaciente = $pacientes->firstWhere('DNI', $datos['DNI'])['DNI'];
        }

        $turnos = $this->getSheetsData('TurnosMedicos')->all();
        foreach ($turnos as $turno) {
            if ((int) $turno['IdTurno'] === (int) $datos['IdTurno']) {
                $turno['Estado'] = 'Ocupado';
                $turno['DNI'] = $IdPaciente;
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
    //       'DNI' => $datos['DNI'],
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
