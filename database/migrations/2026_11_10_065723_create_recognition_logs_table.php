<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('recognition_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('person_id')->nullable()->constrained('people')->nullOnDelete();
            $table->string('captured_image');
            $table->float('confidence_score')->nullable();
            $table->enum('status', ['recognized', 'unknown'])->default('unknown');
            $table->timestamp('detected_at');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('recognition_logs');
    }
};