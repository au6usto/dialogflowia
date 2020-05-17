<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Sheets;

class GoogleSheetsController extends Controller
{
    public function getSheetsData(Request $request)
    {
        $user = $request->user();

        $token = [
          'access_token'  => $user->access_token,
          'refresh_token' => $user->refresh_token,
          'expires_in'    => $user->expires_in,
          'created'       => $user->updated_at->getTimestamp(),
        ];

        $sheetId = '1xaORRQBAxi4Mly_9yccQvgc2KBVpdMWAJTRBkcXRrMI';
        // all() returns array
        $values = Sheets::setAccessToken($token)->spreadsheet($sheetId)->sheet('Sheet 1')->all();
        return $values;
    }
}
