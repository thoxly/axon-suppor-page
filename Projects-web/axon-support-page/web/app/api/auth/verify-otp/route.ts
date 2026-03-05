import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const email = typeof body.email === "string" ? body.email.trim() : "";
    const code = typeof body.code === "string" ? body.code.trim() : "";

    if (!email || !code) {
      return NextResponse.json(
        { error: "Email и код обязательны" },
        { status: 400 },
      );
    }

    const supabase = await createClient();

    const { data, error } = await supabase.auth.verifyOtp({
      type: "email",
      email,
      token: code,
    });

    if (error) {
      console.error("Supabase verifyOtp error:", error.message);
      return NextResponse.json(
        { error: "Неверный или просроченный код" },
        { status: 400 },
      );
    }

    return NextResponse.json({ success: true, user: data?.user ?? null });
  } catch (error) {
    console.error("Verify OTP endpoint error:", error);
    return NextResponse.json(
      { error: "Внутренняя ошибка сервера" },
      { status: 500 },
    );
  }
}

