<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Sheets;

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

        return $rows->reverse()->take(10);
    }

    public function getSpreadSheet($sheetId)
    {
        return $this->getSheetsData($sheetId);
    }
}
