const keys = Object.keys(process.env).filter(k => 
  k.includes('SUPABASE') || k.includes('DB') || k.includes('POSTGRES') || k.includes('PASSWORD') || k.includes('KEY')
);
console.log("Matching env keys in current environment:", keys);
