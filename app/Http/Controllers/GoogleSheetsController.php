<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Sheets;

class GoogleSheetsController extends Controller
{
    public function getSheetsData()
    {
        $spreadSheetId = '1xaORRQBAxi4Mly_9yccQvgc2KBVpdMWAJTRBkcXRrMI';
        $sheetId = 'Medicos';
        $sheets = Sheets::spreadsheet($spreadSheetId)
          ->sheet($sheetId)
          ->get();

        $header = $sheets->pull(0);


        $medicos = Sheets::collection($header, $sheets);

        $medicos = $medicos->reverse()->take(10);

        return $medicos;
    }
}
