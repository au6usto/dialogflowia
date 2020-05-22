<?php

namespace App\Http\Controllers;

use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Foundation\Bus\DispatchesJobs;
use Illuminate\Foundation\Validation\ValidatesRequests;
use Illuminate\Routing\Controller as BaseController;
use App\ResponseUtil;
use Response;

class Controller extends BaseController
{
    use AuthorizesRequests, DispatchesJobs, ValidatesRequests;

    public function sendResponse($result, $message, $code = 201)
    {
        return Response::json(ResponseUtil::makeResponse($message, $result), $code);
    }

    public function sendError($error, $code = 201)
    {
        return Response::json(ResponseUtil::makeError($error), $code);
    }
}
