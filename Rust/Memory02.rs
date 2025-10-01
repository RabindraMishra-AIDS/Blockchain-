//Managing memory in Rust
fn main(){
    let a:u8=10;
    let b:i32=475967705; //32bits(3B memory)
    let c:i128=497597380804809759797594; //we are having memory flexibility over here.

    println!("a={},b={},c={}",a,b,c);
}