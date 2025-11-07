fn main() {
    // let s = String::from("Rabindra Mishra");

    // Making the string mutable
    let mut str = String::from("Rabindra Mishra");
    str.push_str(" hello");
    println!("{}", str);
}