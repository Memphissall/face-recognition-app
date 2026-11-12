<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class RecognitionLog extends Model
{
    protected $guarded = ['id'];

    public function person(): BelongsTo
    {
        return $this->belongsTo(Person::class);
    }
}